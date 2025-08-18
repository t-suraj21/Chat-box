# OTP Email Verification Setup

## Overview
The chat application now includes OTP (One-Time Password) email verification for user registration. Users must verify their email address before creating an account.

## Email Service Configuration

### Environment Variables Required

Add these variables to your backend `.env` file:

```env
# Email Configuration (Required for OTP functionality)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google account
2. Go to **Google Account settings** > **Security** > **App passwords**
3. Generate an app password for "Mail"
4. Use your Gmail address as `EMAIL_USER`
5. Use the generated app password as `EMAIL_PASS` (not your regular password)

### Other Email Services

The application uses Nodemailer and supports various email services:
- **Outlook/Hotmail**: Change service to 'hotmail' in emailService.js
- **Yahoo**: Change service to 'yahoo' in emailService.js
- **Custom SMTP**: Configure custom SMTP settings in emailService.js

## Registration Flow

### Step 1: Email Verification
1. User enters their email address
2. System sends a 6-digit OTP to the email
3. OTP expires in 10 minutes

### Step 2: Account Creation
1. User enters the OTP received via email
2. User completes registration with username and password
3. Account is created with verified email status
4. Welcome email is sent

## API Endpoints

### New Endpoints Added:
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/register` - Complete registration with OTP verification

### Updated Endpoints:
- `POST /api/auth/login` - Now checks for email verification

## Database Changes

### User Model Updates:
- Added `isEmailVerified` field (boolean, default: false)
- Only verified users can log in

### New OTP Model:
- Stores temporary OTP codes
- Auto-expires after 10 minutes
- Tracks usage status

## Security Features

1. **OTP Expiration**: OTPs expire after 10 minutes
2. **Single Use**: Each OTP can only be used once
3. **Rate Limiting**: Built-in countdown for resending OTPs
4. **Email Verification**: Users must verify email before login
5. **Secure Generation**: OTPs are cryptographically secure

## Testing

### Development Testing:
1. Use a real email service (Gmail recommended)
2. Check spam folder for OTP emails
3. Test OTP expiration (wait 10+ minutes)
4. Test resend functionality
5. Test invalid OTP handling

### Production Considerations:
1. Use a dedicated email service (SendGrid, AWS SES, etc.)
2. Set up proper domain authentication
3. Monitor email delivery rates
4. Implement proper error handling and logging

## Troubleshooting

### Common Issues:

1. **OTP emails not received**:
   - Check spam folder
   - Verify EMAIL_USER and EMAIL_PASS
   - Ensure 2FA and app password are set up correctly

2. **"Invalid or expired OTP"**:
   - Check if OTP expired (10 minutes)
   - Ensure OTP wasn't already used
   - Try requesting a new OTP

3. **Email service errors**:
   - Verify email credentials
   - Check network connectivity
   - Review console logs for detailed errors

### Development Tips:
- Use console.log in emailService.js to debug email sending
- Test with multiple email addresses
- Monitor MongoDB for OTP document creation/expiration
- Check browser network tab for API responses

## Email Templates

The system includes two email templates:

1. **OTP Verification Email**: Styled email with 6-digit code
2. **Welcome Email**: Confirmation after successful registration

Both templates are responsive and include your branding.
