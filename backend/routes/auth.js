import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '90d' })
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      })
    }

    const user = new User({
      username,
      email,
      password
    })

    await user.save()

    const token = generateToken(user._id)

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: user.toJSON()
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isPasswordValid = await user.comparePassword(password)
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    user.isOnline = true
    user.lastSeen = new Date()
    await user.save()

    const token = generateToken(user._id)

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/logout', authenticate, async (req, res) => {
  try {
    req.user.isOnline = false
    req.user.lastSeen = new Date()
    await req.user.save()

    res.json({ message: 'Logout successful' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router