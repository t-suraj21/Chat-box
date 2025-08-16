import express from 'express'
import User from '../models/User.js'
import FriendRequest from '../models/FriendRequest.js'
import Friendship from '../models/Friendship.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/request', authenticate, async (req, res) => {
  try {
    const { to } = req.body
    const from = req.user._id

    if (!to) {
      return res.status(400).json({ message: 'Target user ID is required' })
    }

    if (from.toString() === to) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' })
    }

    const targetUser = await User.findById(to)
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    const existingFriendship = await Friendship.findOne({
      users: { $all: [from, to] }
    })

    if (existingFriendship) {
      return res.status(400).json({ message: 'Already friends with this user' })
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from, to, status: 'pending' },
        { from: to, to: from, status: 'pending' }
      ]
    })

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' })
    }

    const friendRequest = new FriendRequest({
      from,
      to
    })

    await friendRequest.save()
    await friendRequest.populate(['from', 'to'])

    res.status(201).json({
      message: 'Friend request sent successfully',
      request: friendRequest
    })

  } catch (error) {
    console.error('Send friend request error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/requests', authenticate, async (req, res) => {
  try {
    const userId = req.user._id

    const friendRequests = await FriendRequest.find({
      to: userId,
      status: 'pending'
    }).populate('from', '-password').sort({ createdAt: -1 })

    res.json(friendRequests)

  } catch (error) {
    console.error('Get friend requests error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/requests/:requestId/accept', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params
    const userId = req.user._id

    const friendRequest = await FriendRequest.findById(requestId)
    
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' })
    }

    if (friendRequest.to.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' })
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' })
    }

    friendRequest.status = 'accepted'
    await friendRequest.save()

    const friendship = new Friendship({
      users: [friendRequest.from, friendRequest.to]
    })
    await friendship.save()

    res.json({ message: 'Friend request accepted successfully' })

  } catch (error) {
    console.error('Accept friend request error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/requests/:requestId/reject', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params
    const userId = req.user._id

    const friendRequest = await FriendRequest.findById(requestId)
    
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' })
    }

    if (friendRequest.to.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' })
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' })
    }

    friendRequest.status = 'rejected'
    await friendRequest.save()

    res.json({ message: 'Friend request rejected successfully' })

  } catch (error) {
    console.error('Reject friend request error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id

    const friendships = await Friendship.find({
      users: userId
    }).populate({
      path: 'users',
      select: '-password',
      match: { _id: { $ne: userId } }
    })

    const friends = friendships.map(friendship => {
      const friend = friendship.users.find(user => user._id.toString() !== userId.toString())
      return friend
    }).filter(Boolean)

    res.json(friends)

  } catch (error) {
    console.error('Get friends error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:friendId', authenticate, async (req, res) => {
  try {
    const { friendId } = req.params
    const userId = req.user._id

    const friendship = await Friendship.findOne({
      users: { $all: [userId, friendId] }
    })

    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' })
    }

    await Friendship.deleteOne({ _id: friendship._id })

    res.json({ message: 'Friend removed successfully' })

  } catch (error) {
    console.error('Remove friend error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router