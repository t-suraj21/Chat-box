# Chat Application

A full-stack real-time chat application built with React.js, Node.js, Express, MongoDB, and Socket.io.

## Features

- ✅ User registration and authentication
- ✅ User profile management
- ✅ Search for existing users
- ✅ Send and accept/reject friend requests
- ✅ Real-time messaging with friends
- ✅ Online/offline status indicators
- ✅ Typing indicators
- ✅ Responsive design with Tailwind CSS

## Tech Stack

**Frontend:**
- React.js 18
- Vite (build tool)
- Tailwind CSS
- React Router
- Axios
- Socket.io Client

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io
- JWT Authentication
- bcryptjs for password hashing

## Setup Instructions

### Prerequisites
- Node.js (v16 or later)
- MongoDB (local or cloud)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your environment variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key-here
```

4. Start MongoDB service on your system

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Register/Login**: Create a new account or login with existing credentials
2. **Profile Setup**: Complete your profile with avatar and bio
3. **Find Friends**: Search for users by username or email
4. **Send Friend Requests**: Add friends by sending friend requests
5. **Accept Requests**: Accept incoming friend requests from the dashboard
6. **Start Chatting**: Click on any friend to start a real-time conversation

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/search` - Search users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update user profile

### Friends
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/requests` - Get pending friend requests
- `PUT /api/friends/requests/:id/accept` - Accept friend request
- `PUT /api/friends/requests/:id/reject` - Reject friend request
- `GET /api/friends` - Get friends list
- `DELETE /api/friends/:id` - Remove friend

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:friendId` - Get chat history
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `GET /api/messages/unread/count` - Get unread message count

## Socket Events

### Client to Server
- `join-chat` - Join a chat room
- `send-message` - Send a message
- `typing` - Notify typing
- `stop-typing` - Stop typing notification

### Server to Client
- `message` - Receive new message
- `typing` - User is typing
- `stop-typing` - User stopped typing
- `user-online` - User came online
- `user-offline` - User went offline

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Chat/
│   │   │   ├── Dashboard/
│   │   │   ├── Friends/
│   │   │   └── Profile/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.