import express from 'express'
import Message from '../models/Message.js'
import Friendship from '../models/Friendship.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/', authenticate, async (req, res) => {
  try {
    const { to, content, messageType = 'text' } = req.body
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
      messageType
    })

    await message.save()
    await message.populate(['from', 'to'])

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
    .populate(['from', 'to'])
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

export default router