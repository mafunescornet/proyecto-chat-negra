"use client"

import { useState, useEffect } from "react"
import { type Conversation, type Tag as TagData, quickReplies } from "@/lib/mock-data"
import { socket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  X, 
  Phone, 
  Mail, 
  MapPin,
  Tag,
  StickyNote,
  Zap,
  ChevronDown,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface ContactPanelProps {
  conversation: Conversation
  onClose: () => void
}

export function ContactPanel({ conversation, onClose }: ContactPanelProps) {
  const [availableTags, setAvailableTags] = useState<TagData[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(conversation.tags)
  const [notes, setNotes] = useState(conversation.internalNotes || "")
  const [isTagsOpen, setIsTagsOpen] = useState(true)
  const [isNotesOpen, setIsNotesOpen] = useState(true)
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(true)
  
  useEffect(() => {
    socket.on('init_tags', (data: TagData[]) => setAvailableTags(data))
    socket.on('tags_updated', (data: TagData[]) => setAvailableTags(data))
    return () => {
      socket.off('init_tags')
      socket.off('tags_updated')
    }
  }, [])

  useEffect(() => {
    setSelectedTags(conversation.tags || [])
    setNotes(conversation.internalNotes || "")
  }, [conversation.tags, conversation.internalNotes])
  
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
      
      const phone = conversation.phoneNumber?.replace(/\D/g, '') || ''
      socket.emit('update_tag', { phone, tags: newTags })
      return newTags
    })
  }
  
  const saveNotes = () => {
    const phone = conversation.phoneNumber?.replace(/\D/g, '') || ''
    socket.emit('update_notes', { phone, notes })
  }
  
  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-foreground">Contact Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Info */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-3">
              <span className="text-xl font-medium text-pink-700">
                {conversation.contactName?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <h4 className="font-semibold text-foreground">{conversation.contactName}</h4>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full mt-1",
              (conversation.status || "active") === "resolved" 
                ? "bg-green-100 text-green-700"
                : (conversation.status || "active") === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-pink-100 text-pink-700"
            )}>
              {(conversation.status || "active").charAt(0).toUpperCase() + (conversation.status || "active").slice(1)}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{conversation.phoneNumber}</span>
            </div>
          </div>
        </div>
        
        {/* Manage Tags */}
        <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
          <CollapsibleTrigger className="w-full p-4 border-b border-border flex items-center justify-between hover:bg-accent/50 transition-colors">
            <span className="flex items-center gap-2 font-medium text-sm text-foreground">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Manage Tags
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isTagsOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name)
                return (
                  <button
                    key={tag.name}
                    onClick={() => toggleTag(tag.name)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors border",
                      isSelected 
                        ? "bg-pink-50 border-pink-300 text-pink-700" 
                        : "bg-background border-border text-muted-foreground hover:border-pink-300"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", tag.color)} />
                    {tag.name}
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Internal Notes */}
        <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
          <CollapsibleTrigger className="w-full p-4 border-b border-border flex items-center justify-between hover:bg-accent/50 transition-colors">
            <span className="flex items-center gap-2 font-medium text-sm text-foreground">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              Internal Notes
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isNotesOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2">Not visible to client</p>
            <Textarea
              placeholder="Add notes about this conversation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button size="sm" onClick={saveNotes} className="mt-2 bg-primary hover:bg-pink-600 text-primary-foreground">
              Save Notes
            </Button>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Quick Replies */}
        <Collapsible open={isQuickRepliesOpen} onOpenChange={setIsQuickRepliesOpen}>
          <CollapsibleTrigger className="w-full p-4 border-b border-border flex items-center justify-between hover:bg-accent/50 transition-colors">
            <span className="flex items-center gap-2 font-medium text-sm text-foreground">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Quick Replies
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isQuickRepliesOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4">
            <div className="space-y-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply.shortcut}
                  className="w-full text-left p-3 rounded-lg bg-pink-50/50 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition-colors"
                >
                  <span className="text-sm font-medium text-pink-700">{reply.shortcut}</span>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reply.text}</p>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  )
}
