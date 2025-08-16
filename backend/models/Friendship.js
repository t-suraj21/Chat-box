import mongoose from 'mongoose'

const friendshipSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

friendshipSchema.index({ users: 1 })

export default mongoose.model('Friendship', friendshipSchema)