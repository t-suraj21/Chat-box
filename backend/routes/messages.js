import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import Message from '../models/Message.js'
import Friendship from '../models/Friendship.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and text files
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|rtf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only images, PDFs, documents, and text files are allowed'))
    }
  }
})

// File upload route
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { to } = req.body
    const from = req.user._id
    const file = req.file

    if (!to || !file) {
      return res.status(400).json({ message: 'Recipient and file are required' })
    }

    const friendship = await Friendship.findOne({
      users: { $all: [from, to] }
    })

    if (!friendship) {
      return res.status(403).json({ message: 'You can only send files to friends' })
    }

    // Determine message type based on file
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    const messageType = imageTypes.includes(file.mimetype) ? 'image' : 'file'

    const message = new Message({
      from,
      to,
      content: req.body.content || '', // Optional caption
      messageType,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      fileSize: file.size,
      status: 'sent'
    })

    await message.save()
    await message.populate(['from', 'to'])

    res.status(201).json(message)

  } catch (error) {
    console.error('File upload error:', error)
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' })
    }
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const { to, content, messageType = 'text', replyTo } = req.body
    const from = req.user._id

    if (!to || !content) {
      return res.status(400).json({ message: 'Recipient and content are required' })
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: 'Message content too long' })
    }

    const friendship = await Friendship.findOne({
      users: { $all: [from, to] }
    })

    if (!friendship) {
      return res.status(403).json({ message: 'You can only send messages to friends' })
    }

    const message = new Message({
      from,
      to,
      content,
      messageType,
      replyTo: replyTo || undefined,
      status: 'sent'
    })

    await message.save()
    await message.populate(['from', 'to', 'replyTo'])

    res.status(201).json(message)

  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/:friendId', authenticate, async (req, res) => {
  try {
    const { friendId } = req.params
    const userId = req.user._id
    const { page = 1, limit = 50 } = req.query

    const friendship = await Friendship.findOne({
      users: { $all: [userId, friendId] }
    })

    if (!friendship) {
      return res.status(403).json({ message: 'You can only view messages with friends' })
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const messages = await Message.find({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId }
      ]
    })
    .populate(['from', 'to', 'replyTo', 'reactions.user'])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

    const reversedMessages = messages.reverse()

    await Message.updateMany(
      {
        from: friendId,
        to: userId,
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    )

    res.json(reversedMessages)

  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params
    const { content } = req.body
    const userId = req.user._id

    if (!content || content.length > 1000) {
      return res.status(400).json({ message: 'Valid content is required and must be under 1000 characters' })
    }

    const message = await Message.findById(messageId)

    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    if (message.from.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' })
    }

    const timeDifference = Date.now() - new Date(message.createdAt).getTime()
    const fiveMinutes = 5 * 60 * 1000

    if (timeDifference > fiveMinutes) {
      return res.status(403).json({ message: 'Messages can only be edited within 5 minutes' })
    }

    message.content = content
    message.isEdited = true
    message.editedAt = new Date()

    await message.save()
    await message.populate(['from', 'to'])

    res.json(message)

  } catch (error) {
    console.error('Edit message error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params
    const userId = req.user._id

    const message = await Message.findById(messageId)

    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    if (message.from.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' })
    }

    await Message.deleteOne({ _id: messageId })

    res.json({ message: 'Message deleted successfully' })

  } catch (error) {
    console.error('Delete message error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const userId = req.user._id

    const unreadCount = await Message.countDocuments({
      to: userId,
      'readBy.user': { $ne: userId }
    })

    res.json({ count: unreadCount })

  } catch (error) {
    console.error('Get unread count error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Add or remove reaction to a message
router.post('/:messageId/reaction', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params
    const { emoji } = req.body
    const userId = req.user._id

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' })
    }

    const message = await Message.findById(messageId)

    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    // Check if user has permission to react (must be involved in the conversation)
    if (message.from.toString() !== userId.toString() && message.to.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only react to messages in your conversations' })
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      reaction => reaction.user.toString() === userId.toString() && reaction.emoji === emoji
    )

    if (existingReactionIndex > -1) {
      // Remove existing reaction
      message.reactions.splice(existingReactionIndex, 1)
    } else {
      // Add new reaction
      message.reactions.push({
        user: userId,
        emoji: emoji,
        createdAt: new Date()
      })
    }

    await message.save()
    await message.populate(['from', 'to', 'replyTo', 'reactions.user'])

    res.json(message)

  } catch (error) {
    console.error('Add reaction error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router