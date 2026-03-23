"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { type Conversation, type Message, quickReplies } from "@/lib/mock-data"
import { socket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send,
  Mic,
  Play,
  Pause,
  PanelRightClose,
  PanelRight,
  Check,
  CheckCheck,
  Image as ImageIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChatViewProps {
  conversation: Conversation
  onToggleContactPanel: () => void
  isContactPanelOpen: boolean
}

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.fromMe;
  
  return (
    <div className={cn(
      "flex",
      isAgent ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-2.5",
        isAgent 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
          : "bg-muted text-foreground rounded-bl-sm"
      )}>
        <p className="text-sm leading-relaxed">{message.content}</p>
        
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isAgent ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10px]",
            isAgent ? "text-white/70" : "text-muted-foreground"
          )}>
            {message.formattedTime}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChatView({ conversation, onToggleContactPanel, isContactPanelOpen }: ChatViewProps) {
  const [newMessage, setNewMessage] = useState("")
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.messages])
  
  const handleSend = () => {
    if (!newMessage.trim()) return
    socket.emit('send_message', { chatId: conversation.id, content: newMessage })
    setNewMessage("")
  }
  
  const handleQuickReply = (text: string) => {
    setNewMessage(text)
    setShowQuickReplies(false)
  }
  
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full bg-background">
      {/* Chat Header */}
      <header className="h-16 px-4 border-b border-border flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-pink-700">
              {conversation.contactName?.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {conversation.contactName}
            </h2>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Online
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Video className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground"
            onClick={onToggleContactPanel}
          >
            {isContactPanelOpen ? (
              <PanelRightClose className="w-5 h-5" />
            ) : (
              <PanelRight className="w-5 h-5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as resolved</DropdownMenuItem>
              <DropdownMenuItem>Block contact</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete conversation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-pink-50/30">
        {conversation.messages?.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="px-4 py-2 border-t border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Quick Replies</p>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply.shortcut}
                onClick={() => handleQuickReply(reply.text)}
                className="px-3 py-1.5 bg-pink-50 text-pink-700 text-sm rounded-full hover:bg-pink-100 transition-colors"
              >
                {reply.shortcut}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-48 p-2">
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
                  <ImageIcon className="w-4 h-4" /> Photo
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
                  <Paperclip className="w-4 h-4" /> Document
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
                  <Mic className="w-4 h-4" /> Voice Note
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
          >
            <Smile className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="pr-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-primary hover:bg-pink-600 text-primary-foreground shrink-0"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
