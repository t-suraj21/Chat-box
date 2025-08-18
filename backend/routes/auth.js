import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import OTP from '../models/OTP.js'
import { authenticate } from '../middleware/auth.js'
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from '../utils/emailService.js'

const router = express.Router()

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '90d' })
}

// Step 1: Send OTP to email for registration
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' })
    }

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email })

    // Generate and save new OTP
    const otp = generateOTP()
    const otpDoc = new OTP({
      email,
      otp
    })
    await otpDoc.save()

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp)
    
    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send OTP email' })
    }

    res.json({
      message: 'OTP sent successfully to your email',
      success: true
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Step 2: Verify OTP and complete registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, otp } = req.body

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Verify OTP
    const otpDoc = await OTP.findOne({ 
      email, 
      otp, 
      isUsed: false 
    }).sort({ createdAt: -1 })

    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid or expired OTP' })
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      })
    }

    // Mark OTP as used
    otpDoc.isUsed = true
    await otpDoc.save()

    // Create user with verified email
    const user = new User({
      username,
      email,
      password,
      isEmailVerified: true
    })

    await user.save()

    // Send welcome email
    await sendWelcomeEmail(email, username)

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

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' })
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