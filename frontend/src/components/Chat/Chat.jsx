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
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userData || !token) {
      navigate('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    const socketInstance = io('https://chat-box-o6vn.onrender.com', {
      auth: { token }
    })

    setSocket(socketInstance)

    socketInstance.emit('join-chat', friendId)

    socketInstance.on('message', (message) => {
      setMessages(prev => [...prev, message])
    })

    socketInstance.on('typing', (data) => {
      if (data.userId !== parsedUser._id) {
        setFriendTyping(true)
      }
    })

    socketInstance.on('stop-typing', (data) => {
      if (data.userId !== parsedUser._id) {
        setFriendTyping(false)
      }
    })

    fetchFriend()
    fetchMessages()

    return () => {
      socketInstance.disconnect()
    }
  }, [friendId, navigate])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchFriend = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`https://chat-box-o6vn.onrender.com/api/users/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriend(response.data)
    } catch (err) {
      console.error('Error fetching friend:', err)
    }
  }

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`https://chat-box-o6vn.onrender.com/api/messages/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(response.data)
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    const messageData = {
      to: friendId,
      content: newMessage.trim()
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('https://chat-box-o6vn.onrender.com/api/messages', messageData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      socket.emit('send-message', response.data)
      setMessages(prev => [...prev, response.data])
      setNewMessage('')
      
      if (typing) {
        socket.emit('stop-typing', { chatId: friendId })
        setTyping(false)
      }
    } catch (err) {
      console.error('Error sending message:', err)
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
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!user || !friend) return <div>Loading...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back
            </button>
            {friend.avatar && (
              <img
                src={friend.avatar}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <h1 className="text-lg font-medium text-gray-900">
                {friend.username}
              </h1>
              <p className="text-sm text-gray-500">
                {friend.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.from._id === user._id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.from._id === user._id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.from._id === user._id
                    ? 'text-blue-100'
                    : 'text-gray-500'
                }`}
              >
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
        
        {friendTyping && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg px-4 py-2">
              <p className="text-sm text-gray-500">
                {friend.username} is typing...
              </p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={sendMessage} className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat