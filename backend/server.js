import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import connectDB from './config/db.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import friendRoutes from './routes/friends.js'
import messageRoutes from './routes/messages.js'
import { authenticateSocket } from './middleware/auth.js'
import path from 'path'

dotenv.config()

const __dirname = path.resolve()


const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "https://chat-box-o6vn.onrender.com",
    methods: ["GET", "POST"]
  }
})

connectDB()

app.use(cors())
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/messages', messageRoutes)

const connectedUsers = new Map()

io.use(authenticateSocket)

io.on('connection', (socket) => {
  console.log('User connected:', socket.user.username)
  
  connectedUsers.set(socket.user._id.toString(), socket.id)
  
  socket.broadcast.emit('user-online', socket.user._id)

  socket.on('join-chat', (friendId) => {
    const chatId = [socket.user._id.toString(), friendId].sort().join('-')
    socket.join(chatId)
    console.log(`${socket.user.username} joined chat: ${chatId}`)
  })

  socket.on('send-message', (message) => {
    const chatId = [message.from._id, message.to._id].sort().join('-')
    socket.to(chatId).emit('message', message)
  })

  socket.on('message-reaction', (data) => {
    const { messageId, emoji, userId } = data
    const targetUserId = userId === socket.user._id.toString() ? data.targetUserId : socket.user._id.toString()
    const chatId = [socket.user._id.toString(), targetUserId].sort().join('-')
    socket.to(chatId).emit('message-reaction', { messageId, emoji, userId })
  })

  socket.on('typing', (data) => {
    const chatId = [socket.user._id.toString(), data.chatId].sort().join('-')
    socket.to(chatId).emit('typing', { userId: socket.user._id })
  })

  socket.on('stop-typing', (data) => {
    const chatId = [socket.user._id.toString(), data.chatId].sort().join('-')
    socket.to(chatId).emit('stop-typing', { userId: socket.user._id })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.username)
    connectedUsers.delete(socket.user._id.toString())
    socket.broadcast.emit('user-offline', socket.user._id)
  })
})

const PORT = process.env.PORT || 5000

app.use(express.static(path.join(__dirname, '/frontend/dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})