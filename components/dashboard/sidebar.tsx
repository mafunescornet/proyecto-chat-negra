"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { socket } from "@/lib/socket"
import { type Tag } from "@/lib/mock-data"
import { WhatsAppModal } from "@/components/dashboard/whatsapp-modal"
import { 
  Search, 
  Inbox, 
  Mail, 
  CheckCircle2,
  MessageSquare,
  Plus,
  Check,
  Wifi,
  WifiOff
} from "lucide-react"

const tagColors = [
  { id: "pink", class: "bg-pink-500" },
  { id: "magenta", class: "bg-pink-600" },
  { id: "rose", class: "bg-rose-400" },
  { id: "fuchsia", class: "bg-fuchsia-500" },
  { id: "neutral", class: "bg-slate-400" },
]

interface SidebarProps {
  activeFilter: string
  setActiveFilter: (filter: string) => void
  activeTag: string | null
  setActiveTag: (tag: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  onResetSelection: () => void
}

const filters = [
  { id: "all", label: "All Inbox", icon: Inbox },
  { id: "unread", label: "Unread", icon: Mail },
  { id: "resolved", label: "Resolved", icon: CheckCircle2 },
]

export function Sidebar({ 
  activeFilter, 
  setActiveFilter, 
  activeTag, 
  setActiveTag,
  searchQuery,
  setSearchQuery,
  onResetSelection
}: SidebarProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState(tagColors[0].id)
  const [showWAModal, setShowWAModal] = useState(false)
  const [isWAConnected, setIsWAConnected] = useState(false)

  useEffect(() => {
    socket.on('init_tags', (data: Tag[]) => setTags(data))
    socket.on('tags_updated', (data: Tag[]) => setTags(data))
    socket.on('whatsapp_ready', () => setIsWAConnected(true))
    socket.on('whatsapp_disconnected', () => setIsWAConnected(false))
    socket.on('init_status', ({ isReady }: { isReady: boolean }) => setIsWAConnected(isReady))
    
    // Actively request tags in case the connection already fired
    socket.emit('get_tags')
    
    return () => {
      socket.off('init_tags')
      socket.off('tags_updated')
      socket.off('whatsapp_ready')
      socket.off('whatsapp_disconnected')
      socket.off('init_status')
    }
  }, [])

  const handleSaveTag = () => {
    if (newTagName.trim()) {
      const selectedColorClass = tagColors.find(c => c.id === selectedColor)?.class || "bg-pink-500"
      const newTag: Tag = {
        id: Date.now().toString(),
        name: newTagName.trim(),
        color: selectedColorClass,
      }
      
      setTags(prev => [...prev, newTag]) // Optimistic UI update
      socket.emit('create_new_tag', newTag)
      
      setNewTagName("")
      setSelectedColor(tagColors[0].id)
      setIsCreatingTag(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveTag()
    } else if (e.key === "Escape") {
      setNewTagName("")
      setSelectedColor(tagColors[0].id)
      setIsCreatingTag(false)
    }
  }

  return (
    <>
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">ChatFlow</span>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search contacts or messages..." 
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Filters */}
        <nav className="px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
          Conversations
        </p>
        <ul className="space-y-1">
          {filters.map((filter) => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.id
            return (
              <li key={filter.id}>
                <button
                  onClick={() => {
                    setActiveFilter(filter.id)
                    setActiveTag(null) // Deselect any active tag
                    onResetSelection()
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      
      {/* Tags */}
      <div className="px-3 py-2 mt-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tags
          </p>
          <button
            onClick={() => setIsCreatingTag(!isCreatingTag)}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-pink-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Inline Create Tag Form */}
        {isCreatingTag && (
          <div className="mb-3 mx-2 p-2 bg-pink-50 rounded-lg border border-pink-100">
            <input
              type="text"
              placeholder="New tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full text-sm px-2 py-1.5 rounded bg-white border border-pink-200 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                {tagColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={cn(
                      "w-4 h-4 rounded-full transition-all",
                      color.class,
                      selectedColor === color.id 
                        ? "ring-2 ring-offset-1 ring-pink-400 scale-110" 
                        : "hover:scale-110"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={handleSaveTag}
                disabled={!newTagName.trim()}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center transition-colors",
                  newTagName.trim() 
                    ? "bg-primary text-primary-foreground hover:bg-pink-600" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        
        <ul className="space-y-1">
          {tags.map((tag) => (
            <li key={tag.id}>
              <button
                onClick={() => {
                  setActiveTag(activeTag === tag.name ? null : tag.name)
                  setActiveFilter('') // Deselect any active category filter
                  onResetSelection()
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  activeTag === tag.name 
                    ? "bg-sidebar-accent text-foreground" 
                    : "text-foreground hover:bg-sidebar-accent"
                )}
              >
                <span className={cn("w-2.5 h-2.5 rounded-full", tag.color)} />
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
        </div>
      </div>

      {/* WhatsApp Connection Button — pinned to sidebar bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
        <button
          onClick={() => setShowWAModal(true)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            isWAConnected
              ? "bg-green-50 text-green-700 hover:bg-green-100"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {isWAConnected ? (
            <Wifi className="w-4 h-4 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate">
            {isWAConnected ? "WhatsApp Connected" : "Connect WhatsApp"}
          </span>
          {isWAConnected && (
            <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          )}
        </button>
      </div>
    </aside>

    <WhatsAppModal open={showWAModal} onClose={() => setShowWAModal(false)} />
  </>
  )
}
