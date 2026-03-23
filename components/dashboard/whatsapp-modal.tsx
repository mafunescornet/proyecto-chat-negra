"use client"

import { useEffect, useRef, useState } from "react"
import { socket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import { Wifi, WifiOff, RefreshCw, X } from "lucide-react"

interface WhatsAppModalProps {
  open: boolean
  onClose: () => void
}

export function WhatsAppModal({ open, onClose }: WhatsAppModalProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [qrDataURL, setQrDataURL] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Request current status every time the modal opens
  useEffect(() => {
    if (!open) return

    setLoading(true)
    socket.emit("get_connection_status")

    const handleStatus = ({ isReady, qrDataURL: qr }: { isReady: boolean; qrDataURL: string | null }) => {
      setIsConnected(isReady)
      setQrDataURL(qr)
      setLoading(false)
    }

    const handleReady = () => {
      setIsConnected(true)
      setQrDataURL(null)
      setLoading(false)
    }

    const handleQR = (dataURL: string) => {
      setIsConnected(false)
      setQrDataURL(dataURL)
      setLoading(false)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
      setLoading(false)
    }

    socket.on("connection_status", handleStatus)
    socket.on("whatsapp_ready", handleReady)
    socket.on("qr_code", handleQR)
    socket.on("whatsapp_disconnected", handleDisconnected)

    return () => {
      socket.off("connection_status", handleStatus)
      socket.off("whatsapp_ready", handleReady)
      socket.off("qr_code", handleQR)
      socket.off("whatsapp_disconnected", handleDisconnected)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {/* WhatsApp logo */}
            <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <h2 className="font-semibold text-foreground">WhatsApp</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 flex flex-col items-center text-center gap-4">
          {loading ? (
            <>
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Checking connection…</p>
            </>
          ) : isConnected ? (
            /* ── Connected state ── */
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Wifi className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Connected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your WhatsApp account is linked and ready.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active session
              </span>
            </>
          ) : qrDataURL ? (
            /* ── QR waiting state ── */
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open WhatsApp on your phone, go to{" "}
                <strong>Linked Devices</strong> and scan this code.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataURL}
                alt="WhatsApp QR Code"
                className="w-56 h-56 rounded-xl border border-border shadow-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                QR code refreshes automatically
              </p>
            </>
          ) : (
            /* ── Backend not started ── */
            <>
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <WifiOff className="w-9 h-9 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Not connected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Start the backend server to generate a QR code.
                </p>
              </div>
              <code className="text-xs bg-muted px-3 py-1.5 rounded-lg text-muted-foreground">
                node backend/index.js
              </code>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
