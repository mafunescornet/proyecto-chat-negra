const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
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
    origin: '*', // Allow React frontend
    methods: ['GET', 'POST']
  }
});

let isReady = false;

// 2. Session Persistence with LocalAuth
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  // 1. QR Code Generation
  console.log('\n--- SCAN REQUIRED ---');
  console.log('Scan this QR code with your WhatsApp app to log in.');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  // 3. Connection Logs
  console.log('✅ WhatsApp authenticated successfully!');
});

client.on('auth_failure', msg => {
  // 3. Connection Logs
  console.error('❌ WhatsApp authentication failure:', msg);
});

client.on('ready', async () => {
  // 3. Connection Logs
  console.log('🚀 WhatsApp client is ready!');
  isReady = true;

  io.emit('whatsapp_ready');

  try {
    // 4. Socket.io Integration: Fetch recent chats and emit
    console.log('Fetching recent chats...');
    const chats = await client.getChats();
    const recentChats = chats.slice(0, 15); // Last 15 chats

    // Emit exactly what you requested
    io.emit('init_data', recentChats);
    console.log(`Sent ${recentChats.length} recent chats to frontend via init_data event.`);

    // Also emit in the format the React frontend expects
    const formattedData = formatChatsForFrontend(recentChats);
    io.emit('conversations_data', formattedData); 

  } catch (err) {
    console.error('Error fetching recent chats:', err);
  }
});

// 5. Message Listener
client.on('message', async (msg) => {
  console.log(`📩 New message from ${msg.from}: ${msg.body}`);
  try {
    const contact = await msg.getContact();

    io.emit('message_received', {
      chatId: msg.from,
      message: {
        id: msg.id.id,
        content: msg.body || 'Media/System message',
        fromMe: false,
        formattedTime: new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
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

// Front-end connection management
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.emit('init_tags', savedTags);

  socket.on('get_tags', () => {
    socket.emit('init_tags', savedTags);
  });

  socket.on('create_new_tag', (newTag) => {
    savedTags.push(newTag);
    fs.writeFileSync(tagsFile, JSON.stringify(savedTags, null, 2));
    io.emit('tags_updated', savedTags);
  });

  // Notify client of current status upon connection
  socket.emit('init_status', { isReady });

  socket.on('get_init_status', () => {
    socket.emit('init_status', { isReady });
  });

  socket.on('get_conversations', async () => {
    if (isReady) {
      try {
        const chats = await client.getChats();
        const recentChats = chats.slice(0, 15);
        socket.emit('conversations_data', formatChatsForFrontend(recentChats));
      } catch (err) {
        console.error('Error in get_conversations:', err);
      }
    }
  });

  socket.on('get_chat_messages', async (chatId) => {
    if (isReady) {
      try {
        const chat = await client.getChatById(chatId);
        const rawMessages = await chat.fetchMessages({ limit: 200 });
        
        const mappedMessages = rawMessages.map(msg => ({
          id: msg.id.id,
          content: msg.body || 'Media/System message',
          fromMe: msg.fromMe,
          formattedTime: new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        socket.emit('chat_messages_data', { chatId, messages: mappedMessages });
      } catch (err) {
        console.error('Error in get_chat_messages:', err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

function formatChatsForFrontend(chats) {
  return chats.map(chat => {
    const lastMsg = chat.lastMessage;
    return {
      id: chat.id._serialized,
      contactName: chat.name || chat.id.user,
      phoneNumber: chat.id.user,
      lastMessage: lastMsg ? (lastMsg.body || 'Media/System message') : 'No messages',
      timestamp: lastMsg ? new Date((lastMsg.timestamp || Date.now() / 1000) * 1000).toISOString() : new Date().toISOString(),
      unreadCount: chat.unreadCount || 0,
      tags: [],
      status: 'active'
    };
  });
}

client.initialize();

const PORT = 3001; // Port 3001 so it doesn't conflict with frontend on 3000
server.listen(PORT, () => {
  console.log(`📡 Socket.io Server running on port ${PORT}`);
});
