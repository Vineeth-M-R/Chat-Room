import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [name, setName] = useState('')
  const [isInChatRoom, setIsInChatRoom] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Fetch messages from database
  async function fetchMessages() {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        // If database fetch fails, try loading from localStorage as fallback
        const localMessages = localStorage.getItem('chat-messages')
        if (localMessages) {
          try {
            const parsed = JSON.parse(localMessages)
            setMessages(
              parsed.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
            )
          } catch (e) {
            console.error('Error parsing local messages:', e)
          }
        }
        return
      }

      if (data) {
        const formattedMessages = data.map((msg) => ({
          id: msg.id,
          sender: msg.sender,
          text: msg.text,
          timestamp: new Date(msg.created_at)
        }))
        setMessages(formattedMessages)
        // Also save to localStorage as backup
        localStorage.setItem('chat-messages', JSON.stringify(formattedMessages))
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Try localStorage as fallback
      const localMessages = localStorage.getItem('chat-messages')
      if (localMessages) {
        try {
          const parsed = JSON.parse(localMessages)
          setMessages(
            parsed.map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          )
        } catch (e) {
          console.error('Error parsing local messages:', e)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!isInChatRoom) return

    // Fetch initial messages
    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = {
            id: payload.new.id,
            sender: payload.new.sender,
            text: payload.new.text,
            timestamp: new Date(payload.new.created_at)
          }
          // Only add if message doesn't already exist (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isInChatRoom])

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) {
      setIsInChatRoom(true)
    }
  }

  function handleLogout() {
    setIsInChatRoom(false)
    setName('')
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (newMessage.trim() && name.trim()) {
      const messageText = newMessage.trim()
      const tempId = Date.now() // Temporary ID for optimistic update
      
      // Optimistic update - show message immediately
      const optimisticMessage = {
        id: tempId,
        sender: name,
        text: messageText,
        timestamp: new Date()
      }
      
      setMessages((prev) => {
        const allMessages = [...prev, optimisticMessage]
        // Save to localStorage immediately for persistence
        localStorage.setItem('chat-messages', JSON.stringify(allMessages))
        return allMessages
      })
      setNewMessage('')

      // Try to save to database
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender: name,
            text: messageText
          })
          .select()
          .single()

        if (error) {
          console.error('Error saving message to database:', error)
          // If database save fails, we keep the optimistic message
          // Message is already in localStorage, so it will persist
        } else if (data) {
          // Replace optimistic message with real one from database
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === tempId
                ? {
                    id: data.id,
                    sender: data.sender,
                    text: data.text,
                    timestamp: new Date(data.created_at)
                  }
                : msg
            )
            localStorage.setItem('chat-messages', JSON.stringify(updated))
            return updated
          })
        }
      } catch (error) {
        console.error('Error sending message:', error)
        // Message is already shown optimistically and saved to localStorage
      }
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (isInChatRoom) {
    return (
      <div className="chat-room-container">
        {/* Header */}
        <header className="chat-room-header">
          <h2 className="chat-room-title">Chat Room</h2>
          <div className="chat-room-header-right">
            <p className="chat-room-user">You are: {name}</p>
            <button onClick={handleLogout} className="chat-room-logout-button">
              Logout
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <div className="chat-room-messages">
          {isLoading && messages.length === 0 ? (
            <div className="loading-messages">Loading messages...</div>
          ) : (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.sender === name
                return (
                  <div
                    key={message.id}
                    className={`message-bubble ${isOwnMessage ? 'message-own' : 'message-other'}`}
                  >
                    <div className="message-sender">{message.sender}</div>
                    <div className="message-text">{message.text}</div>
                    <div className="message-timestamp">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="chat-room-input-form">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="chat-room-input"
            autoFocus
          />
          <button type="submit" disabled={!newMessage.trim()} className="chat-room-send-button">
            Send
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="enter-chat-container">
      <div className="enter-chat-card">
        <h1 className="enter-chat-title">Join the Chat Room</h1>
        <p className="enter-chat-subtitle">Enter a name to start chatting</p>
        <form onSubmit={handleSubmit} className="enter-chat-form">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="enter-chat-input"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="enter-chat-button"
          >
            Enter Chat
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
