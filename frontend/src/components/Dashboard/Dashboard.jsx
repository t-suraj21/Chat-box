import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import UserSearch from './UserSearch'
import FriendsList from '../Friends/FriendsList'

const Dashboard = () => {
  const [user, setUser] = useState(null)
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('friends')
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userData || !token) {
      navigate('/login')
      return
    }

    setUser(JSON.parse(userData))
    loadDashboardData()
  }, [navigate])

  const loadDashboardData = async () => {
    setLoading(true)
    await Promise.all([fetchFriends(), fetchFriendRequests()])
    setLoading(false)
  }

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('https://chat-box-o6vn.onrender.com/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriends(response.data)
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('https://chat-box-o6vn.onrender.com/api/friends/requests', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriendRequests(response.data)
    } catch (err) {
      console.error('Error fetching friend requests:', err)
    }
  }

  const handleFriendRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `https://chat-box-o6vn.onrender.com/api/friends/requests/${requestId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      )
      fetchFriendRequests()
      if (action === 'accept') {
        fetchFriends()
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        // Call logout endpoint to update user status
        await axios.post('https://chat-box-o6vn.onrender.com/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local storage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  const startChat = (friendId) => {
    navigate(`/chat/${friendId}`)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Modern Header */}
      <header className="bg-white/70 backdrop-blur-xl shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full border-2 border-indigo-200 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-green-400 w-4 h-4 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-lg">
                    Hello, {user.username}! 👋
                  </h1>
                  <p className="text-sm text-gray-500 hidden sm:block">Ready to chat with friends?</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/profile')}
                className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 group"
                title="Profile"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage your connections and start conversations</p>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* Friends Card */}
          <div className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{friends.length}</p>
                <p className="text-sm text-gray-500 font-medium">Total Friends</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              {friends.filter(friend => friend.isOnline).length} currently online
            </div>
          </div>

          {/* Requests Card */}
          <div className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{friendRequests.length}</p>
                <p className="text-sm text-gray-500 font-medium">Pending Requests</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
              {friendRequests.length > 0 ? 'Needs your attention' : 'All caught up!'}
            </div>
          </div>

          {/* Messages Card */}
          <div className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-rose-200 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                  {Math.floor(Math.random() * 50) + 10}
                </p>
                <p className="text-sm text-gray-500 font-medium">Messages Today</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Active conversations
            </div>
          </div>
        </div>

        {/* Modern Mobile Tab Navigation */}
        <div className="lg:hidden mb-8">
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
            <div className="flex">
              {[
                { key: 'friends', label: 'Friends', icon: '👥' },
                { key: 'requests', label: `Requests${friendRequests.length > 0 ? ` (${friendRequests.length})` : ''}`, icon: '📩' },
                { key: 'search', label: 'Search', icon: '🔍' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search Section */}
          <div className={`lg:col-span-1 ${activeTab !== 'search' ? 'hidden lg:block' : ''}`}>
            <UserSearch onRefreshRequests={fetchFriendRequests} />
          </div>

          <div className="lg:col-span-3 space-y-8">
            {/* Friend Requests */}
            <div className={`${activeTab !== 'requests' ? 'hidden lg:block' : ''}`}>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Friend Requests</h2>
                      <p className="text-sm text-gray-500">People who want to connect with you</p>
                    </div>
                  </div>
                  {friendRequests.length > 0 && (
                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full">
                      {friendRequests.length} new
                    </span>
                  )}
                </div>

                {friendRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up! 🎉</h3>
                    <p className="text-gray-500">No pending friend requests at the moment</p>
                    <p className="text-gray-400 text-sm mt-1">New requests will appear here when they arrive</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friendRequests.map((request) => (
                      <div
                        key={request._id}
                        className="group flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-emerald-200 transition-all duration-300"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            {request.from.avatar ? (
                              <img
                                src={request.from.avatar}
                                alt="Avatar"
                                className="w-14 h-14 rounded-full object-cover border-3 border-white shadow-sm"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-semibold text-lg">
                                  {request.from.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-emerald-400 w-5 h-5 rounded-full border-2 border-white"></div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-lg">{request.from.username}</p>
                            <p className="text-sm text-gray-500">Wants to connect with you</p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleFriendRequestAction(request._id, 'accept')}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleFriendRequestAction(request._id, 'reject')}
                            className="px-6 py-2.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200 transform hover:scale-105"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Friends List */}
            <div className={`${activeTab !== 'friends' ? 'hidden lg:block' : ''}`}>
              <FriendsList friends={friends} onStartChat={startChat} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard