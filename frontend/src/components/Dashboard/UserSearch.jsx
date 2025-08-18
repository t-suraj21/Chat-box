import { useState } from 'react'
import axios from 'axios'

const UserSearch = ({ onRefreshRequests }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')
    setHasSearched(true)

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
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
      <div className="flex items-center mb-6">
        <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">Find Friends</h2>
      </div>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-sm font-medium rounded-md hover:from-purple-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-6 animate-pulse">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {!hasSearched && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 font-medium">Search for users</p>
            <p className="text-gray-400 text-sm">Enter a username or email to find friends</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Searching users...</p>
          </div>
        )}

        {hasSearched && !loading && searchResults.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-500 font-medium">No users found</p>
            <p className="text-gray-400 text-sm">Try a different search term</p>
          </div>
        )}

        {searchResults.map((user) => (
          <div
            key={user._id}
            className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-gray-200 hover:shadow-md hover:bg-white/80 transition-all duration-200"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.username}</p>
                {user.bio && (
                  <p className="text-sm text-gray-500 truncate mt-1">{user.bio}</p>
                )}
              </div>
            </div>
            
            <div className="ml-3 flex-shrink-0">
              {!user.isFriend && !user.requestSent && !user.requestReceived && (
                <button
                  onClick={() => sendFriendRequest(user._id)}
                  className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-blue-300"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add
                </button>
              )}
              
              {user.requestSent && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sent
                </div>
              )}
              
              {user.requestReceived && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Pending
                </div>
              )}
              
              {user.isFriend && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Friends
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserSearch