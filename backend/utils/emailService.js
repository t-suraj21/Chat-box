import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create transporter (you'll need to configure this with your email service)
const createTransporter = () => {
  // For development, you can use a service like Gmail, Outlook, or a testing service
  // For production, use services like SendGrid, AWS SES, etc.
  
  return nodemailer.createTransporter({
    service: 'gmail', // Change this to your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your email password or app-specific password
    }
  });
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@chatapp.com',
      to: email,
      subject: 'Verify Your Email - Chat App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Email Verification</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555;">Hello,</p>
            <p style="font-size: 16px; color: #555;">
              Thank you for registering with Chat App! To complete your registration, please enter the following OTP:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; background-color: #e9ecef; padding: 15px 25px; border-radius: 8px; display: inline-block;">
                ${otp}
              </span>
            </div>
            <p style="font-size: 14px; color: #666;">
              This OTP is valid for 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © 2024 Chat App. All rights reserved.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after successful verification
export const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@chatapp.com',
      to: email,
      subject: 'Welcome to Chat App!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745; text-align: center;">Welcome to Chat App!</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555;">Hello ${username},</p>
            <p style="font-size: 16px; color: #555;">
              Congratulations! Your email has been successfully verified and your account is now active.
            </p>
            <p style="font-size: 16px; color: #555;">
              You can now:
            </p>
            <ul style="color: #555;">
              <li>Search and connect with friends</li>
              <li>Send and receive real-time messages</li>
              <li>Update your profile and status</li>
              <li>Enjoy all the features of Chat App</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                 style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Start Chatting Now
              </a>
            </div>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © 2024 Chat App. All rights reserved.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};
