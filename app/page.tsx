"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { ConversationList } from "@/components/dashboard/conversation-list"
import { ChatView } from "@/components/dashboard/chat-view"
import { ContactPanel } from "@/components/dashboard/contact-panel"
import { type Conversation } from "@/lib/mock-data"
import { socket } from "@/lib/socket"

export default function SupportDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(true)
  const [isBackendReady, setIsBackendReady] = useState(false)

  useEffect(() => {
    // Initial fetch
    socket.on('init_status', ({ isReady }) => {
      setIsBackendReady(isReady)
      if (isReady) socket.emit('get_conversations')
    })

    socket.on('whatsapp_ready', () => {
      setIsBackendReady(true)
      socket.emit('get_conversations')
    })

    socket.on('conversations_data', (data) => {
      setConversations(data)
    })

    socket.on('chat_messages_data', ({ chatId, messages }) => {
      setConversations(prev => prev.map(conv => 
        conv.id === chatId ? { ...conv, messages } : conv
      ))
      setSelectedConversation(prev => {
        if (!prev) return prev
        return prev.id === chatId ? { ...prev, messages } : prev
      })
    })

    socket.on('message_received', ({ chatId, message, contactInfo, tags }) => {
      setConversations(prev => {
        const existing = prev.find(c => c.id === chatId)
        if (existing) {
          return prev.map(c => c.id === chatId ? {
            ...c,
            lastMessage: message.content || "Message",
            timestamp: message.formattedTime,
            messages: [...(c.messages || []), message],
            unreadCount: c.unreadCount + 1
          } : c)
        } else {
          const newConv: Conversation = {
            id: chatId,
            contactName: contactInfo.name,
            phoneNumber: contactInfo.phone,
            lastMessage: message.content || "Message",
            timestamp: message.formattedTime,
            messages: [message],
            unreadCount: 1,
            tags: tags,
            status: 'active'
          }
          return [newConv, ...prev]
        }
      })
      setSelectedConversation(prev => {
        if (!prev) return prev
        const updatedMessages = prev.messages ? [...prev.messages, message] : [message]
        return prev.id === chatId ? { ...prev, lastMessage: message.content || "Message", timestamp: message.formattedTime, messages: updatedMessages } : prev
      })
    })

    socket.on('message_sent', ({ chatId, message }) => {
      setConversations(prev => prev.map(c => c.id === chatId ? {
        ...c,
        lastMessage: message.content || "Message",
        timestamp: message.formattedTime,
        messages: [...(c.messages || []), message]
      } : c))
      setSelectedConversation(prev => {
        if (!prev) return prev
        return prev.id === chatId ? { ...prev, lastMessage: message.content || "Message", timestamp: message.formattedTime, messages: [...(prev.messages || []), message] } : prev
      })
    })

    socket.on('tag_updated', ({ phone, tags }) => {
      setConversations(prev => prev.map(c => {
        const cPhone = c.phoneNumber?.replace(/\D/g, '') || ''
        return cPhone === phone || cPhone.includes(phone) || phone.includes(cPhone) ? { ...c, tags } : c
      }))
      setSelectedConversation(prev => {
        if (!prev) return prev
        const pPhone = prev.phoneNumber?.replace(/\D/g, '') || ''
        if (pPhone === phone || pPhone.includes(phone) || phone.includes(pPhone)) {
          return { ...prev, tags }
        }
        return prev
      })
    })

    return () => {
      socket.off('init_status')
      socket.off('whatsapp_ready')
      socket.off('conversations_data')
      socket.off('chat_messages_data')
      socket.off('message_received')
      socket.off('message_sent')
      socket.off('tag_updated')
    }
  }, [])

  // Actively request data once listeners are registered (fixes race condition)
  useEffect(() => {
    socket.emit('get_init_status')
    socket.emit('get_conversations')
  }, [])

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv)
    if (!conv.messages || conv.messages.length === 0) {
      socket.emit('get_chat_messages', conv.id)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    // Filter by search query
    if (searchQuery && !conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !conv.phoneNumber.includes(searchQuery)) {
      return false
    }
    
    // Filter by status
    if (activeFilter === "unread" && !conv.unreadCount) return false
    if (activeFilter === "flagged" && !conv.tags?.includes("Urgent")) return false
    if (activeFilter === "resolved" && conv.status !== "resolved") return false
    
    // Filter by tag
    if (activeTag && !conv.tags?.includes(activeTag)) return false
    
    return true
  })

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar 
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onResetSelection={() => setSelectedConversation(null)}
      />
      
      <ConversationList 
        conversations={filteredConversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
      />
      
      <div className="flex flex-1 min-w-0 h-full overflow-hidden">
        {selectedConversation ? (
          <>
            <ChatView 
              conversation={selectedConversation}
              onToggleContactPanel={() => setIsContactPanelOpen(!isContactPanelOpen)}
              isContactPanelOpen={isContactPanelOpen}
            />
            {isContactPanelOpen && (
              <ContactPanel 
                conversation={selectedConversation}
                onClose={() => setIsContactPanelOpen(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-pink-50/80 to-background">
            <div className="text-center max-w-sm px-6">
              {!isBackendReady && (
                <div className="mb-4 text-pink-600 font-medium">Connecting to WhatsApp... Check backend terminal for QR Code.</div>
              )}
              <div className="w-32 h-32 mx-auto mb-6 relative">
                <svg 
                  className="w-full h-full text-pink-200" 
                  fill="none" 
                  viewBox="0 0 128 128" 
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M108 58c0 22.091-19.625 40-43.846 40-6.462 0-12.615-1.164-18.154-3.273L20 104l6.769-18.109C22.154 79.727 20 72.182 20 64c0-22.091 19.625-40 43.846-40C88.375 24 108 41.909 108 64v-6z" 
                  />
                  <circle cx="48" cy="64" r="4" fill="currentColor" className="text-pink-300" />
                  <circle cx="64" cy="64" r="4" fill="currentColor" className="text-pink-300" />
                  <circle cx="80" cy="64" r="4" fill="currentColor" className="text-pink-300" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Select a conversation
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
