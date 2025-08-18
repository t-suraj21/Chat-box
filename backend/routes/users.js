import express from 'express'
import User from '../models/User.js'
import FriendRequest from '../models/FriendRequest.js'
import Friendship from '../models/Friendship.js'
import Message from '../models/Message.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query
    const currentUserId = req.user._id

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' })
    }

    const searchRegex = new RegExp(q.trim(), 'i')
    
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: searchRegex },
        { email: searchRegex }
      ]
    }).select('-password').limit(10)

    const friendRequests = await FriendRequest.find({
      $or: [
        { from: currentUserId },
        { to: currentUserId }
      ]
    })

    const friendships = await Friendship.find({
      users: currentUserId
    })

    const friendIds = friendships.reduce((acc, friendship) => {
      friendship.users.forEach(userId => {
        if (userId.toString() !== currentUserId.toString()) {
          acc.add(userId.toString())
        }
      })
      return acc
    }, new Set())

    const usersWithStatus = users.map(user => {
      const userId = user._id.toString()
      const sentRequest = friendRequests.find(req => 
        req.from.toString() === currentUserId.toString() && 
        req.to.toString() === userId && 
        req.status === 'pending'
      )
      const receivedRequest = friendRequests.find(req => 
        req.from.toString() === userId && 
        req.to.toString() === currentUserId.toString() && 
        req.status === 'pending'
      )

      return {
        ...user.toPublicJSON(),
        isFriend: friendIds.has(userId),
        requestSent: !!sentRequest,
        requestReceived: !!receivedRequest
      }
    })

    res.json(usersWithStatus)

  } catch (error) {
    console.error('Search users error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Return public profile (without email) unless it's the user's own profile
    if (req.params.id === req.user._id.toString()) {
      res.json(user.toJSON())
    } else {
      res.json(user.toPublicJSON())
    }

  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, email, bio, avatar } = req.body
    const userId = req.user._id

    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' })
    }

    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      })
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        username, 
        email, 
        bio: bio || '', 
        avatar: avatar || '' 
      },
      { new: true }
    ).select('-password')

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete account endpoint
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body
    const userId = req.user._id

    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' })
    }

    // Verify password before deletion
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' })
    }

    // Start cleanup process - delete all related data
    console.log(`Starting account deletion for user: ${user.username} (${user.email})`)

    // Delete all messages sent by this user
    await Message.deleteMany({ from: userId })
    console.log('Deleted messages sent by user')

    // Delete all messages sent to this user
    await Message.deleteMany({ to: userId })
    console.log('Deleted messages sent to user')

    // Delete all friend requests involving this user
    await FriendRequest.deleteMany({
      $or: [{ from: userId }, { to: userId }]
    })
    console.log('Deleted friend requests')

    // Delete all friendships involving this user
    await Friendship.deleteMany({
      users: userId
    })
    console.log('Deleted friendships')

    // Finally, delete the user account
    await User.findByIdAndDelete(userId)
    console.log('Deleted user account')

    res.json({ 
      message: 'Account deleted successfully. You can now create a new account with the same email.' 
    })

  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ message: 'Server error occurred while deleting account' })
  }
})

export default router