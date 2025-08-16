import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import io from 'socket.io-client'

const Chat = () => {
  const { friendId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [friend, setFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [typing, setTyping] = useState(false)
  const [friendTyping, setFriendTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const messageInputRef = useRef(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userData || !token) {
      navigate('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    const initializeChat = async () => {
      try {
        setLoading(true)
        
        // Create socket connection
        const socketInstance = io('https://chat-box-o6vn.onrender.com', {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000
        })

        setSocket(socketInstance)

        // Set up socket event listeners
        socketInstance.on('connect', () => {
          console.log('Socket connected:', socketInstance.id)
          setConnected(true)
          setError('')
          socketInstance.emit('join-chat', friendId)
        })

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason)
          setConnected(false)
          if (reason === 'io server disconnect') {
            // Server disconnected, need to reconnect manually
            socketInstance.connect()
          }
        })

        socketInstance.on('reconnect', () => {
          console.log('Socket reconnected')
          setConnected(true)
          setError('')
          socketInstance.emit('join-chat', friendId)
        })

        socketInstance.on('reconnect_error', (error) => {
          console.error('Reconnection failed:', error)
          setError('Connection lost. Trying to reconnect...')
        })

        socketInstance.on('message', (message) => {
          console.log('Received message:', message)
          setMessages(prev => {
            // Prevent duplicate messages
            const exists = prev.some(msg => msg._id === message._id)
            if (exists) return prev
            return [...prev, message]
          })
        })

        socketInstance.on('typing', (data) => {
          console.log('User typing:', data)
          if (data.userId !== parsedUser._id) {
            setFriendTyping(true)
          }
        })

        socketInstance.on('stop-typing', (data) => {
          console.log('User stopped typing:', data)
          if (data.userId !== parsedUser._id) {
            setFriendTyping(false)
          }
        })

        socketInstance.on('error', (error) => {
          console.error('Socket error:', error)
          setError('Connection error occurred')
        })

        // Fetch initial data
        await Promise.all([fetchFriend(token), fetchMessages(token)])
        setLoading(false)

      } catch (err) {
        console.error('Error initializing chat:', err)
        setError('Failed to initialize chat')
        setLoading(false)
      }
    }

    initializeChat()

    // Cleanup function
    return () => {
      if (socket) {
        console.log('Cleaning up socket connection')
        socket.off('connect')
        socket.off('disconnect')
        socket.off('reconnect')
        socket.off('reconnect_error')
        socket.off('message')
        socket.off('typing')
        socket.off('stop-typing')
        socket.off('error')
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [friendId, navigate]) // Only depend on friendId and navigate

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchFriend = async (token) => {
    try {
      const response = await axios.get(`https://chat-box-o6vn.onrender.com/api/users/${friendId}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      })
      setFriend(response.data)
    } catch (err) {
      console.error('Error fetching friend:', err)
      setError('Failed to load friend information')
    }
  }

  const fetchMessages = async (token) => {
    try {
      const response = await axios.get(`https://chat-box-o6vn.onrender.com/api/messages/${friendId}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      })
      setMessages(response.data)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || sending || !connected) return

    const messageContent = newMessage.trim()
    setSending(true)
    setNewMessage('') // Clear input immediately for better UX
    
    // Stop typing immediately
    if (typing) {
      socket.emit('stop-typing', { chatId: friendId })
      setTyping(false)
    }

    const messageData = {
      to: friendId,
      content: messageContent
    }

    try {
      const token = localStorage.getItem('token')
      console.log('Sending message:', messageData)
      
      const response = await axios.post('https://chat-box-o6vn.onrender.com/api/messages', messageData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      console.log('Message sent successfully:', response.data)

      // Emit the message through socket for real-time delivery
      socket.emit('send-message', response.data)
      
      // Add message to local state immediately (optimistic update)
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg._id === response.data._id)
        if (exists) return prev
        return [...prev, response.data]
      })

    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      // Restore message on error
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)

    if (!socket) return

    if (!typing) {
      setTyping(true)
      socket.emit('typing', { chatId: friendId })
    }

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      if (typing) {
        setTyping(false)
        socket.emit('stop-typing', { chatId: friendId })
      }
    }, 1000)
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isLastMessageFromSender = (messages, index) => {
    return index === messages.length - 1 || messages[index + 1]?.from._id !== messages[index].from._id
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!user || !friend) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">Chat not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                {friend.avatar ? (
                  <img
                    src={friend.avatar}
                    alt="Avatar"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-200"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {friend.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  friend.isOnline ? 'bg-green-400' : 'bg-gray-400'
                }`}></div>
              </div>
              
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  {friend.username}
                </h1>
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-600 flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      friend.isOnline ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                    {friend.isOnline ? 'Online' : 'Offline'}
                  </p>
                  {/* Connection Status */}
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      connected ? 'bg-green-500' : 'bg-red-500'
                    } ${!connected ? 'animate-pulse' : ''}`}></div>
                    <span className={`text-xs ${
                      connected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {connected ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded-md animate-pulse">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.from._id === user._id
            const showAvatar = isLastMessageFromSender(messages, index)
            
            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                  showAvatar ? 'mb-4' : 'mb-1'
                }`}
              >
                <div className={`flex items-end space-x-2 max-w-xs sm:max-w-md lg:max-w-lg ${
                  isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {!isOwnMessage && showAvatar && (
                    <div className="flex-shrink-0">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {friend.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                    isOwnMessage
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-900'
                  } ${showAvatar ? 'rounded-bl-sm' : isOwnMessage ? 'rounded-br-2xl' : 'rounded-bl-2xl'}`}>
                    <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    {showAvatar && (
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        
        {/* Typing Indicator */}
        {friendTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {friend.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white/80 backdrop-blur-md border-t border-white/20 p-4">
        <form onSubmit={sendMessage} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(e)
                }
              }}
            />
            {newMessage.trim() && (
              <button
                type="button"
                className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setNewMessage('')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !connected}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat