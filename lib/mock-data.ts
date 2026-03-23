export interface Message {
  id: string
  content: string
  fromMe: boolean
  formattedTime: string
}

export interface Conversation {
  id: string
  contactName: string
  phoneNumber: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  tags: string[]
  messages?: Message[] // Optional because we fetch on demand
  status?: "active" | "resolved" | "pending"
  internalNotes?: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export const quickReplies = [
  { shortcut: "/welcome", text: "Hello! Thank you for reach out to our support team. How can I assist you today?" },
  { shortcut: "/pricing", text: "I'd be happy to share our pricing information with you. Our plans start at $29/month. Would you like me to send you the full pricing sheet?" },
  { shortcut: "/thanks", text: "Thank you for contacting us! Is there anything else I can help you with?" },
  { shortcut: "/hold", text: "Please hold on while I look into this for you. I'll get back to you shortly." },
  { shortcut: "/resolved", text: "I'm glad I could help resolve your issue! If you have any other questions, feel free to reach out anytime." }
]
