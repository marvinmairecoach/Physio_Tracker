"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { MessageSquare, Plus, Send, ArrowLeft, User, Loader2 } from "lucide-react"
import { Button, Modal, TextInput } from "@mantine/core"

const API_PREFIX = "/physio-data/api"

// ── Types ──────────────────────────────────────────────────────────────

interface Participant {
  id: string
  firstName: string
  lastName: string
  role: string
}

interface Conversation {
  id: string
  participants: Participant[]
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
    senderName: string
  } | null
  lastReadAt: string | null
}

interface Message {
  id: string
  content: string
  senderId: string
  sender: { firstName: string; lastName: string }
  createdAt: string
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  role: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getConversationTitle(conv: Conversation, currentUserId?: string): string {
  const others = conv.participants.filter((p) => p.id !== currentUserId)
  if (others.length === 0) return "Moi"
  return others.map((p) => `${p.firstName} ${p.lastName}`).join(", ")
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (isToday) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function isUnread(conv: Conversation): boolean {
  if (!conv.lastMessage || !conv.lastReadAt) return !!conv.lastMessage
  return new Date(conv.lastMessage.createdAt) > new Date(conv.lastReadAt)
}

// ── New Conversation Modal ──────────────────────────────────────────────

interface NewConversationModalProps {
  opened: boolean
  onClose: () => void
  onCreated: (conversationId: string) => void
  currentUserId?: string
}

function NewConversationModal({ opened, onClose, onCreated, currentUserId }: NewConversationModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    if (!opened) {
      setSearch("")
      return
    }
    setLoading(true)
    fetch(`${API_PREFIX}/messaging/contacts`)
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : data.contacts ?? []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }, [opened])

  const filtered = contacts.filter(
    (c) =>
      !search ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleSelect(contact: Contact) {
    setCreating(contact.id)
    try {
      const res = await fetch(`${API_PREFIX}/messaging/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: contact.id }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création de la conversation")
      const data = await res.json()
      onCreated(data.conversation?.id ?? data.id)
      onClose()
    } catch {
      // silent
    } finally {
      setCreating(null)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Nouvelle conversation"
      size="sm"
      trapFocus={false}
      returnFocus={false}
    >
      <TextInput
        placeholder="Rechercher un contact..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {contacts.length === 0 ? "Aucun contact disponible" : "Aucun résultat"}
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={creating === c.id}
              onClick={() => handleSelect(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                {getInitials(`${c.firstName} ${c.lastName}`)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {c.firstName} {c.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{c.role}</p>
              </div>
              {creating === c.id && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Conversation List Sidebar ───────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  currentUserId?: string
}

function ConversationList({ conversations, selectedId, onSelect, currentUserId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Aucune conversation</p>
        <p className="text-xs text-gray-400 mt-1">Cliquez sur &quot;Nouveau&quot; pour en démarrer une</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const title = getConversationTitle(conv, currentUserId)
        const unread = isUnread(conv)
        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 transition-colors hover:bg-blue-50/50 ${
              selectedId === conv.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                {getInitials(title)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm truncate ${unread ? "font-semibold text-gray-900" : "text-gray-700"}`}
                  >
                    {title}
                  </p>
                  {unread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage.content}</p>
                )}
              </div>
              {conv.lastMessage && (
                <span className="text-[10px] text-gray-400 shrink-0">
                  {formatMessageTime(conv.lastMessage.createdAt)}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Message Thread ──────────────────────────────────────────────────────

interface MessageThreadProps {
  messages: Message[]
  loading: boolean
  currentUserId?: string
}

function MessageThread({ messages, loading, currentUserId }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Aucun message</p>
        <p className="text-xs text-gray-400 mt-1">Envoyez le premier message</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg) => {
        const isMine = msg.senderId === currentUserId
        return (
          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMine
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}
            >
              {!isMine && (
                <p className="text-[11px] font-medium text-blue-600 mb-0.5">
                  {msg.sender.firstName} {msg.sender.lastName}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 text-right ${
                  isMine ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {formatMessageTime(msg.createdAt)}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

// ── Message Input ───────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  sending?: boolean
}

function MessageInput({ onSend, disabled, sending }: MessageInputProps) {
  const [text, setText] = useState("")

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          disabled={disabled}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || disabled || sending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const [newConvModalOpen, setNewConvModalOpen] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)

  // Fetch current user
  useEffect(() => {
    fetch("/physio-data/api/auth/me")
      .then((r) => r.json())
      .then((data) => setCurrentUserId(data.user?.id ?? undefined))
      .catch(() => {})
  }, [])

  // Fetch conversations
  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    setConversationsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/messaging/conversations`)
      if (!res.ok) throw new Error("Erreur lors du chargement des conversations")
      const data = await res.json()
      setConversations(Array.isArray(data) ? data : data.conversations ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setConversationsLoading(false)
    }
  }

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([])
      return
    }
    setMessagesLoading(true)
    fetch(`${API_PREFIX}/messaging/conversations/${selectedConvId}/messages?limit=50`)
      .then((r) => r.json())
      .then((data) => {
        const msgs = Array.isArray(data) ? data : data.messages ?? []
        setMessages(msgs)
        // Mark as read by updating local state
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, lastReadAt: new Date().toISOString() } : c)),
        )
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false))
  }, [selectedConvId])

  async function handleSend(content: string) {
    if (!selectedConvId) return
    setSending(true)
    try {
      const res = await fetch(`${API_PREFIX}/messaging/conversations/${selectedConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Erreur lors de l'envoi")
      const data = await res.json()

      // Optimistically add the message
      const newMsg: Message = {
        id: data.message?.id ?? data.id ?? `temp-${Date.now()}`,
        content,
        senderId: currentUserId ?? "",
        sender: { firstName: "", lastName: "" },
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, newMsg])

      // Update conversation list with new last message
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === selectedConvId
            ? {
                ...c,
                lastMessage: {
                  content,
                  createdAt: new Date().toISOString(),
                  senderId: currentUserId ?? "",
                  senderName: "",
                },
                lastReadAt: new Date().toISOString(),
              }
            : c,
        )
        // Move conversation to top
        const idx = updated.findIndex((c) => c.id === selectedConvId)
        if (idx > 0) {
          const [item] = updated.splice(idx, 1)
          updated.unshift(item)
        }
        return updated
      })
    } catch {
      // silent
    } finally {
      setSending(false)
    }
  }

  function handleConversationCreated(convId: string) {
    // Refresh list and select this new conversation
    fetchConversations().then(() => setSelectedConvId(convId))
  }

  // Mobile state: show list or thread
  const [showList, setShowList] = useState(true)

  const selectedConv = conversations.find((c) => c.id === selectedConvId)

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ── Sidebar / Conversation List ── */}
      <div
        className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${
          showList ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm">Messages</h2>
          <Button
            variant="filled"
            size="compact-sm"
            color="blue"
            onClick={() => setNewConvModalOpen(true)}
            leftSection={<Plus className="h-3.5 w-3.5" />}
          >
            Nouveau
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button
                type="button"
                onClick={fetchConversations}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConvId}
              onSelect={(id) => {
                setSelectedConvId(id)
                setShowList(false)
              }}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>

      {/* ── Message Area ── */}
      <div
        className={`flex-1 flex flex-col ${showList ? "hidden md:flex" : "flex"}`}
      >
        {!selectedConv ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
              <MessageSquare className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Sélectionnez une conversation</p>
            <p className="text-xs text-gray-400 mt-1">
              Choisissez une conversation dans la liste ou créez-en une nouvelle
            </p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <button
                type="button"
                className="md:hidden text-gray-500 hover:text-gray-700"
                onClick={() => setShowList(true)}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                {getInitials(getConversationTitle(selectedConv, currentUserId))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {getConversationTitle(selectedConv, currentUserId)}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedConv.participants.length} participant{selectedConv.participants.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <MessageThread messages={messages} loading={messagesLoading} currentUserId={currentUserId} />

            {/* Input */}
            <MessageInput onSend={handleSend} disabled={!selectedConvId} sending={sending} />
          </>
        )}
      </div>

      {/* ── New Conversation Modal ── */}
      <NewConversationModal
        opened={newConvModalOpen}
        onClose={() => setNewConvModalOpen(false)}
        onCreated={handleConversationCreated}
        currentUserId={currentUserId}
      />
    </div>
  )
}