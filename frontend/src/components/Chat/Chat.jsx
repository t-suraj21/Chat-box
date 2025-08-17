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
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const messageInputRef = useRef(null)

  // Common emoji reactions
  const reactions = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎']
  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']

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
            const exists = prev.some(msg => msg._id === message._id)
            if (exists) return prev
            return [...prev, { ...message, status: 'delivered' }]
          })
        })

        socketInstance.on('message-reaction', (data) => {
          setMessages(prev => prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, reactions: data.reactions }
              : msg
          ))
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
        socket.off('message-reaction')
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
  }, [friendId, navigate])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

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
      // Add status to messages
      const messagesWithStatus = response.data.map(msg => ({
        ...msg,
        status: msg.from._id === user?._id ? 'read' : 'delivered',
        reactions: msg.reactions || []
      }))
      setMessages(messagesWithStatus)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    }
  }

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || sending || !connected) return

    const messageContent = newMessage.trim()
    setSending(true)
    setNewMessage('')
    setReplyingTo(null)
    
    if (typing) {
      socket.emit('stop-typing', { chatId: friendId })
      setTyping(false)
    }

    const messageData = {
      to: friendId,
      content: messageContent,
      replyTo: replyingTo?._id
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('https://chat-box-o6vn.onrender.com/api/messages', messageData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const messageWithStatus = { ...response.data, status: 'sent', reactions: [] }
      socket.emit('send-message', messageWithStatus)
      
      setMessages(prev => {
        const exists = prev.some(msg => msg._id === response.data._id)
        if (exists) return prev
        return [...prev, messageWithStatus]
      })

      // Simulate status updates
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg._id === response.data._id ? { ...msg, status: 'delivered' } : msg
        ))
      }, 1000)

      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg._id === response.data._id ? { ...msg, status: 'read' } : msg
        ))
      }, 2000)

    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
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

  const addReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`https://chat-box-o6vn.onrender.com/api/messages/${messageId}/reaction`, 
        { emoji }, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Update local state
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const reactions = msg.reactions || []
          const existingReaction = reactions.find(r => r.user === user._id && r.emoji === emoji)
          
          if (existingReaction) {
            return { ...msg, reactions: reactions.filter(r => !(r.user === user._id && r.emoji === emoji)) }
          } else {
            return { ...msg, reactions: [...reactions, { user: user._id, emoji, createdAt: new Date() }] }
          }
        }
        return msg
      }))

      if (socket) {
        socket.emit('message-reaction', { messageId, emoji, userId: user._id })
      }
    } catch (err) {
      console.error('Error adding reaction:', err)
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`https://chat-box-o6vn.onrender.com/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setMessages(prev => prev.filter(msg => msg._id !== messageId))
      setSelectedMessage(null)
    } catch (err) {
      console.error('Error deleting message:', err)
      setError('Failed to delete message')
    }
  }

  const startEdit = (message) => {
    setEditingMessage(message)
    setNewMessage(message.content)
    setSelectedMessage(null)
    messageInputRef.current?.focus()
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setNewMessage('')
  }

  const saveEdit = async () => {
    if (!editingMessage || !newMessage.trim()) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(`https://chat-box-o6vn.onrender.com/api/messages/${editingMessage._id}`, 
        { content: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setMessages(prev => prev.map(msg => 
        msg._id === editingMessage._id ? { ...response.data, status: msg.status, reactions: msg.reactions } : msg
      ))
      
      setEditingMessage(null)
      setNewMessage('')
    } catch (err) {
      console.error('Error editing message:', err)
      setError('Failed to edit message')
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setUploadingFile(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('to', friendId)
      
      const token = localStorage.getItem('token')
      const response = await axios.post('https://chat-box-o6vn.onrender.com/api/messages/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      const messageWithStatus = { ...response.data, status: 'sent', reactions: [] }
      socket.emit('send-message', messageWithStatus)
      
      setMessages(prev => {
        const exists = prev.some(msg => msg._id === response.data._id)
        if (exists) return prev
        return [...prev, messageWithStatus]
      })

      // Simulate status updates
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg._id === response.data._id ? { ...msg, status: 'delivered' } : msg
        ))
      }, 1000)

      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg._id === response.data._id ? { ...msg, status: 'read' } : msg
        ))
      }, 2000)

    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const searchMessages = (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const filtered = messages.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase()) ||
      (message.fileName && message.fileName.toLowerCase().includes(query.toLowerCase()))
    )
    setSearchResults(filtered)
  }

  const highlightSearchTerm = (text, query) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
          {part}
        </mark>
      ) : part
    )
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

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'delivered':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
          </svg>
        )
      case 'read':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
          </svg>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!user || !friend) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">Chat not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="h-screen bg-white flex flex-col relative touch-pan-y"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-purple-500/20 border-4 border-dashed border-purple-500 flex items-center justify-center z-50">
          <div className="text-center">
            <svg className="w-16 h-16 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xl font-semibold text-purple-700">Drop files here to share</p>
            <p className="text-purple-600">Images, documents, and more</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                {friend.avatar ? (
                  <img
                    src={friend.avatar}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {friend.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {friend.username}
                </h1>
                <p className="text-sm text-gray-500">
                  {friend.isOnline ? 'Active now' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              connected ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              } ${!connected ? 'animate-pulse' : ''}`}></div>
              <span className={`text-xs font-medium ${
                connected ? 'text-green-700' : 'text-red-700'
              }`}>
                {connected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchMessages(e.target.value)
                }}
                placeholder="Search messages..."
                className="w-full px-4 py-2 pl-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => {
                setShowSearch(false)
                setSearchQuery('')
                setSearchResults([])
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Results */}
          {searchQuery && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </p>
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {searchResults.slice(0, 5).map((message) => (
                    <div
                      key={message._id}
                      className="p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        // Scroll to message (simplified)
                        const messageElement = document.getElementById(`message-${message._id}`)
                        if (messageElement) {
                          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {message.from.username}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {highlightSearchTerm(message.content || message.fileName, searchQuery)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.from._id === user._id
            const showAvatar = isLastMessageFromSender(messages, index)
            const showTimestamp = showAvatar || (index > 0 && new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000)
            
            return (
              <div key={message._id}>
                {/* Timestamp separator */}
                {showTimestamp && (
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                )}
                
                <div
                  id={`message-${message._id}`}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group relative`}
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
                    
                    <div className="relative">
                      {/* Message bubble */}
                      <div
                        className={`relative rounded-2xl px-4 py-2 shadow-sm ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        } ${!showAvatar ? (isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md') : ''} select-none`}
                        onDoubleClick={() => addReaction(message._id, '❤️')}
                        onTouchStart={(e) => {
                          const touchStartTime = Date.now()
                          const longPressTimer = setTimeout(() => {
                            addReaction(message._id, '❤️')
                          }, 500)
                          
                          const handleTouchEnd = () => {
                            clearTimeout(longPressTimer)
                            document.removeEventListener('touchend', handleTouchEnd)
                          }
                          
                          document.addEventListener('touchend', handleTouchEnd)
                        }}
                      >
                        {/* Reply indicator */}
                        {message.replyTo && (
                          <div className={`text-xs opacity-75 mb-1 p-2 rounded ${
                            isOwnMessage ? 'bg-white/20' : 'bg-gray-200'
                          }`}>
                            Replying to: {message.replyTo.content?.substring(0, 50)}...
                          </div>
                        )}
                        
                        {/* Message content based on type */}
                        {message.messageType === 'image' ? (
                          <div className="space-y-2">
                            <img
                              src={message.fileUrl}
                              alt="Shared image"
                              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.fileUrl, '_blank')}
                            />
                            {message.content && (
                              <p className="text-sm leading-relaxed break-words">
                                {message.content}
                              </p>
                            )}
                          </div>
                        ) : message.messageType === 'file' ? (
                          <div className="space-y-2">
                            <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                              isOwnMessage ? 'bg-white/20' : 'bg-gray-50'
                            }`}>
                              <div className={`p-2 rounded-lg ${
                                isOwnMessage ? 'bg-white/30' : 'bg-gray-200'
                              }`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isOwnMessage ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {message.fileName}
                                </p>
                                <p className={`text-xs ${
                                  isOwnMessage ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {message.fileSize && formatFileSize(message.fileSize)}
                                </p>
                              </div>
                              <button
                                onClick={() => window.open(message.fileUrl, '_blank')}
                                className={`p-1 rounded-full transition-colors ${
                                  isOwnMessage 
                                    ? 'hover:bg-white/20 text-white' 
                                    : 'hover:bg-gray-200 text-gray-600'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            </div>
                            {message.content && (
                              <p className="text-sm leading-relaxed break-words">
                                {message.content}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed break-words">
                            {message.content}
                          </p>
                        )}
                        
                        {message.isEdited && (
                          <span className={`text-xs opacity-75 ${isOwnMessage ? 'text-white' : 'text-gray-500'}`}>
                            (edited)
                          </span>
                        )}
                        
                        {/* Message status */}
                        {isOwnMessage && (
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <span className="text-xs opacity-75">
                              {formatTime(message.createdAt)}
                            </span>
                            {getMessageStatusIcon(message.status)}
                          </div>
                        )}
                      </div>
                      
                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(
                            message.reactions.reduce((acc, reaction) => {
                              acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
                              return acc
                            }, {})
                          ).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message._id, emoji)}
                              className="flex items-center space-x-1 bg-white border border-gray-200 rounded-full px-2 py-1 text-xs hover:bg-gray-50 transition-colors"
                            >
                              <span>{emoji}</span>
                              <span className="text-gray-600">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Message actions */}
                    <div className={`opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center space-x-1 ${
                      isOwnMessage ? 'flex-row-reverse' : ''
                    } md:opacity-0`}>
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        title="Reply"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                      
                      <div className="relative">
                        <button
                          onClick={() => setSelectedMessage(selectedMessage === message._id ? null : message._id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                          title="React"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        
                        {/* Quick reactions */}
                        {selectedMessage === message._id && (
                          <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                            {reactions.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  addReaction(message._id, emoji)
                                  setSelectedMessage(null)
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {isOwnMessage && (
                        <>
                          <button
                            onClick={() => startEdit(message)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => deleteMessage(message._id)}
                            className="p-1 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
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
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2">
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

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-sm text-gray-600">
                Replying to: {replyingTo.content.substring(0, 50)}...
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {editingMessage && (
          <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">Editing message</span>
            <div className="flex space-x-2">
              <button
                onClick={saveEdit}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={editingMessage ? saveEdit : sendMessage} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={uploadingFile}
                title="Attach file"
              >
                {uploadingFile ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={handleTyping}
                placeholder={editingMessage ? "Edit your message..." : "Message..."}
                className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all duration-200 max-h-32 text-base touch-manipulation"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (editingMessage) {
                      saveEdit()
                    } else {
                      sendMessage(e)
                    }
                  }
                }}
              />
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileUpload(file)
                  e.target.value = '' // Reset input
                }
              }}
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
            />
            
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 right-0 sm:left-0 sm:right-auto bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-full sm:w-80 max-h-60 overflow-y-auto z-20">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="p-2 hover:bg-gray-100 rounded transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !connected}
            className="p-3 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : editingMessage ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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