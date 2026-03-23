"use client"

import { cn } from "@/lib/utils"
import { type Conversation } from "@/lib/mock-data"
import { Mic, Camera, Check, CheckCheck } from "lucide-react"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
}

function MessageStatusIcon({ status }: { status?: string }) {
  if (!status) return null
  
  if (status === "sent") {
    return <Check className="w-3 h-3 text-muted-foreground" />
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3 h-3 text-muted-foreground" />
  }
  if (status === "read") {
    return <CheckCheck className="w-3 h-3 text-pink-500" />
  }
  return null
}

function MessageTypeIcon({ type }: { type: string }) {
  if (type === "audio") {
    return <Mic className="w-3.5 h-3.5 text-muted-foreground mr-1" />
  }
  if (type === "image") {
    return <Camera className="w-3.5 h-3.5 text-muted-foreground mr-1" />
  }
  return null
}

function TagBadge({ tag }: { tag: string }) {
  const colorMap: Record<string, string> = {
    "Urgent": "bg-red-100 text-red-700",
    "New Lead": "bg-green-100 text-green-700",
    "Support": "bg-pink-100 text-pink-700"
  }
  
  return (
    <span className={cn(
      "text-[10px] font-medium px-1.5 py-0.5 rounded",
      colorMap[tag] || "bg-muted text-muted-foreground"
    )}>
      {tag}
    </span>
  )
}

export function ConversationList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation 
}: ConversationListProps) {
  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Messages</h2>
        <p className="text-sm text-muted-foreground">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
        </p>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={cn(
                "w-full p-4 border-b border-border text-left transition-colors hover:bg-accent/50",
                selectedConversation?.id === conversation.id && "bg-pink-50 hover:bg-pink-50 border-l-2 border-l-primary"
              )}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-pink-700">
                      {conversation.contactName?.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-pink-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <h3 className={cn(
                        "text-sm truncate",
                        conversation.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                      )}>
                        {conversation.contactName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.phoneNumber}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {typeof conversation.timestamp === 'string' && conversation.timestamp.includes('T') ? new Date(conversation.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : conversation.timestamp}
                    </span>
                  </div>
                  
                  {/* Last Message Preview */}
                  <div className="flex items-center gap-1 mb-2">
                    <p className={cn(
                      "text-sm truncate flex-1",
                      conversation.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {conversation.lastMessage}
                    </p>
                  </div>
                  
                  {/* Tags */}
                  {conversation.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {conversation.tags.map(tag => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
