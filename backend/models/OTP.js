import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires in 10 minutes
  },
  isUsed: {
    type: Boolean,
    default: false
  }
});

// Index for faster queries
otpSchema.index({ email: 1, createdAt: -1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
