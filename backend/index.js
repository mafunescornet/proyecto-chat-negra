const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const fs = require('fs');
const path = require('path');

const tagsFile = path.join(__dirname, 'tags.json');
let savedTags = [];
if (fs.existsSync(tagsFile)) {
  savedTags = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
} else {
  savedTags = [
    { id: "1", name: "Urgent", color: "bg-red-500" },
    { id: "2", name: "New Lead", color: "bg-success" },
    { id: "3", name: "Support", color: "bg-pink-500" }
  ];
  fs.writeFileSync(tagsFile, JSON.stringify(savedTags, null, 2));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let isReady = false;
let lastQRDataURL = null; // last generated QR as a base64 PNG data URL

const client = new Client({
  authStrategy: new LocalAuth()
});

// ---------------------------------------------------------------------------
// Message type helpers
// ---------------------------------------------------------------------------

// These types carry no readable content for the user; skip them entirely.
const SILENT_SYSTEM_TYPES = new Set([
  'ciphertext',
  'protocol',
]);

// These system types ARE shown in chat, but as a centered info line (no bubble).
const SYSTEM_TYPE_LABELS = {
  e2e_notification:       '🔒 Messages are end-to-end encrypted.',
  notification:           'ℹ️ Notification',
  notification_template:  'ℹ️ Notification',
  gp2:                    'ℹ️ Group update',
  broadcast_notification: '📢 Broadcast',
  call_log:               '📞 Missed call',
};

// Media types with their emoji fallback labels (used when there is no caption).
const MEDIA_TYPE_LABELS = {
  image:    '📷 Image',
  video:    '🎞️ Video',
  audio:    '🎵 Audio',
  ptt:      '🎙️ Voice Note',
  document: '📎 Document',
  sticker:  '🎭 Sticker',
  location: '📍 Location',
};

/**
 * Maps a single raw whatsapp-web.js message to the shape the frontend expects.
 * Never call this for SILENT_SYSTEM_TYPES messages (filter those first).
 */
function mapMessage(msg) {
  const formattedTime = new Date(msg.timestamp * 1000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // System event — render as centered gray text in the chat view
  if (SYSTEM_TYPE_LABELS[msg.type]) {
    return {
      id: msg.id.id,
      content: SYSTEM_TYPE_LABELS[msg.type],
      fromMe: msg.fromMe,
      formattedTime,
      isSystem: true,
    };
  }

  // Media message — use caption when present, otherwise use the emoji label
  if (MEDIA_TYPE_LABELS[msg.type]) {
    return {
      id: msg.id.id,
      content: msg.body || MEDIA_TYPE_LABELS[msg.type],
      fromMe: msg.fromMe,
      formattedTime,
      mediaType: msg.type,
    };
  }

  // Plain text (or any type we haven't explicitly handled)
  return {
    id: msg.id.id,
    content: msg.body || '💬 Message',
    fromMe: msg.fromMe,
    formattedTime,
  };
}

/**
 * Returns the short preview string shown in the conversation list.
 */
function getLastMessagePreview(lastMsg) {
  if (!lastMsg) return 'No messages';

  if (SYSTEM_TYPE_LABELS[lastMsg.type]) {
    return SYSTEM_TYPE_LABELS[lastMsg.type];
  }

  if (MEDIA_TYPE_LABELS[lastMsg.type]) {
    // Show caption if the user wrote one, otherwise show the emoji label
    return lastMsg.body
      ? `${MEDIA_TYPE_LABELS[lastMsg.type]}: ${lastMsg.body}`
      : MEDIA_TYPE_LABELS[lastMsg.type];
  }

  return lastMsg.body || '💬 Message';
}

// ---------------------------------------------------------------------------
// WhatsApp client events
// ---------------------------------------------------------------------------

client.on('qr', async (qr) => {
  console.log('\n--- SCAN REQUIRED ---');
  console.log('Scan this QR code with your WhatsApp app to log in.');
  qrcode.generate(qr, { small: true });
  try {
    lastQRDataURL = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
    io.emit('qr_code', lastQRDataURL);
  } catch (err) {
    console.error('Error generating QR data URL:', err);
  }
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated successfully!');
});

client.on('auth_failure', msg => {
  console.error('❌ WhatsApp authentication failure:', msg);
  isReady = false;
  io.emit('whatsapp_disconnected');
});

client.on('ready', async () => {
  console.log('🚀 WhatsApp client is ready!');
  isReady = true;
  lastQRDataURL = null; // no longer needed
  io.emit('whatsapp_ready');

  try {
    console.log('Fetching recent chats...');
    const chats = await client.getChats();
    const recentChats = chats.slice(0, 15);

    io.emit('init_data', recentChats);
    console.log(`Sent ${recentChats.length} recent chats to frontend via init_data event.`);

    const formattedData = formatChatsForFrontend(recentChats);
    io.emit('conversations_data', formattedData);
  } catch (err) {
    console.error('Error fetching recent chats:', err);
  }
});

// Live incoming messages
client.on('message', async (msg) => {
  console.log(`📩 New message from ${msg.from}: ${msg.body}`);

  // Drop silent system types silently
  if (SILENT_SYSTEM_TYPES.has(msg.type)) return;

  try {
    const contact = await msg.getContact();

    io.emit('message_received', {
      chatId: msg.from,
      message: mapMessage(msg),
      contactInfo: {
        name: contact.name || contact.pushname || msg.from,
        phone: msg.from.split('@')[0]
      },
      tags: []
    });
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
});

// ---------------------------------------------------------------------------
// Socket.io connection handlers
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.emit('init_tags', savedTags);
  socket.emit('init_status', { isReady });

  // Let the modal know the current connection state immediately
  socket.on('get_connection_status', () => {
    socket.emit('connection_status', { isReady, qrDataURL: lastQRDataURL });
  });

  socket.on('get_tags', () => {
    socket.emit('init_tags', savedTags);
  });

  socket.on('create_new_tag', (newTag) => {
    savedTags.push(newTag);
    fs.writeFileSync(tagsFile, JSON.stringify(savedTags, null, 2));
    io.emit('tags_updated', savedTags);
  });

  socket.on('get_init_status', () => {
    socket.emit('init_status', { isReady });
  });

  socket.on('get_conversations', async () => {
    if (!isReady) return;
    try {
      const chats = await client.getChats();
      const recentChats = chats.slice(0, 15);
      socket.emit('conversations_data', formatChatsForFrontend(recentChats));
    } catch (err) {
      console.error('Error in get_conversations:', err);
    }
  });

  socket.on('get_chat_messages', async (chatId) => {
    if (!isReady) return;
    try {
      const chat = await client.getChatById(chatId);
      const rawMessages = await chat.fetchMessages({ limit: 200 });

      const mappedMessages = rawMessages
        // Drop completely silent types (ciphertext, protocol)
        .filter(msg => !SILENT_SYSTEM_TYPES.has(msg.type))
        // Map everything else
        .map(msg => mapMessage(msg));

      socket.emit('chat_messages_data', { chatId, messages: mappedMessages });
    } catch (err) {
      console.error('Error in get_chat_messages:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ---------------------------------------------------------------------------
// Conversation list formatter
// ---------------------------------------------------------------------------

function formatChatsForFrontend(chats) {
  return chats.map(chat => {
    const lastMsg = chat.lastMessage;
    return {
      id: chat.id._serialized,
      contactName: chat.name || chat.id.user,
      phoneNumber: chat.id.user,
      lastMessage: getLastMessagePreview(lastMsg),
      timestamp: lastMsg
        ? new Date((lastMsg.timestamp || Date.now() / 1000) * 1000).toISOString()
        : new Date().toISOString(),
      unreadCount: chat.unreadCount || 0,
      tags: [],
      status: 'active'
    };
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

client.initialize();

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`📡 Socket.io Server running on port ${PORT}`);
});
