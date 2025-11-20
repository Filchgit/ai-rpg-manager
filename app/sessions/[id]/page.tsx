'use client'

import { use, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import SessionCostDashboard from '@/components/SessionCostDashboard'

type Message = {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

type Session = {
  id: string
  name: string
  status: string
  campaign: {
    id: string
    name: string
  }
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showCosts, setShowCosts] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSession()
    fetchMessages()
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${id}`)
      const data = await response.json()
      setSession(data)
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/sessions/${id}/messages`)
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    setError('')
    setSending(true)
    const userMessage = input.trim()
    setInput('')

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: 'temp-user',
      role: 'USER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await fetch(`/api/sessions/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const aiResponse = await response.json()

      // Add AI response
      const aiMessage: Message = {
        id: 'temp-ai',
        role: 'ASSISTANT',
        content: aiResponse.content,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), tempUserMessage, aiMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'))
      setInput(userMessage)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          Loading session...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          Session not found
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col container mx-auto px-4 py-4">
        <div className="mb-4">
          <Link
            href={`/campaigns/${session.campaign.id}`}
            className="text-purple-400 hover:text-purple-300"
          >
            ← Back to {session.campaign.name}
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">{session.name}</h1>
              <p className="text-sm text-gray-400">Status: {session.status}</p>
            </div>
            <button
              onClick={() => setShowCosts(!showCosts)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {showCosts ? 'Hide Costs' : 'Show Costs'}
            </button>
          </div>
        </div>

        {/* Cost Dashboard */}
        {showCosts && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <SessionCostDashboard sessionId={session.id} />
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto max-h-[calc(100vh-300px)]">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No messages yet. Start your adventure!</p>
              <p className="text-sm mt-2">
                Try something like: "I enter the tavern and look around."
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id + index}
                  className={`${
                    message.role === 'USER'
                      ? 'bg-purple-900/30 ml-8'
                      : 'bg-blue-900/30 mr-8'
                  } rounded-lg p-4`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        {message.role === 'USER' ? 'You' : 'Dungeon Master'}
                      </div>
                      <div className="text-white whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4">
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending || session.status !== 'ACTIVE'}
              placeholder={
                session.status !== 'ACTIVE'
                  ? 'Session is not active'
                  : 'Describe your action...'
              }
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || session.status !== 'ACTIVE'}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

