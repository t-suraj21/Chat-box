import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    
    if (!token) {
      return next(new Error('No token provided'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    
    if (!user) {
      return next(new Error('Invalid token'))
    }

    socket.user = user
    next()
  } catch (error) {
    next(new Error('Authentication error'))
  }
}