import { useState } from 'react'
import axios from 'axios'

const UserSearch = ({ onRefreshRequests }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `https://chat-box-o6vn.onrender.com/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` }}
      )
      setSearchResults(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const sendFriendRequest = async (userId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        'https://chat-box-o6vn.onrender.com/api/friends/request',
        { to: userId },
        { headers: { Authorization: `Bearer ${token}` }}
      )
      
      setSearchResults(searchResults.map(user => 
        user._id === userId 
          ? { ...user, requestSent: true }
          : user
      ))
      
      if (onRefreshRequests) {
        onRefreshRequests()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send friend request')
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Search Users</h2>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {searchResults.map((user) => (
          <div
            key={user._id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{user.username}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                {user.bio && (
                  <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
                )}
              </div>
            </div>
            
            {!user.isFriend && !user.requestSent && !user.requestReceived && (
              <button
                onClick={() => sendFriendRequest(user._id)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Friend
              </button>
            )}
            
            {user.requestSent && (
              <span className="text-sm text-gray-500">Request sent</span>
            )}
            
            {user.requestReceived && (
              <span className="text-sm text-yellow-600">Request received</span>
            )}
            
            {user.isFriend && (
              <span className="text-sm text-green-600">Friends</span>
            )}
          </div>
        ))}
        
        {searchResults.length === 0 && searchQuery && !loading && (
          <p className="text-gray-500 text-center py-4">No users found</p>
        )}
      </div>
    </div>
  )
}

export default UserSearch