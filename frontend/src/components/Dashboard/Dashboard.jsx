import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import UserSearch from './UserSearch'
import FriendsList from '../Friends/FriendsList'

const Dashboard = () => {
  const [user, setUser] = useState(null)
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userData || !token) {
      navigate('/login')
      return
    }

    setUser(JSON.parse(userData))
    fetchFriends()
    fetchFriendRequests()
  }, [navigate])

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('http://localhost:8001/api/friends', {
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
      const response = await axios.get('http://localhost:8001/api/friends/requests', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriendRequests(response.data)
    } catch (err) {
      console.error('Error fetching friend requests:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const startChat = (friendId) => {
    navigate(`/chat/${friendId}`)
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="font-medium text-gray-900">
                Welcome, {user.username}
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <UserSearch onRefreshRequests={fetchFriendRequests} />
          </div>

          <div className="md:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Friend Requests ({friendRequests.length})
              </h2>
              {friendRequests.length === 0 ? (
                <p className="text-gray-500">No pending friend requests</p>
              ) : (
                <div className="space-y-3">
                  {friendRequests.map((request) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {request.from.avatar && (
                          <img
                            src={request.from.avatar}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium">{request.from.username}</p>
                          <p className="text-sm text-gray-500">{request.from.email}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token')
                              await axios.put(
                                `http://localhost:8001/api/friends/requests/${request._id}/accept`,
                                {},
                                { headers: { Authorization: `Bearer ${token}` }}
                              )
                              fetchFriendRequests()
                              fetchFriends()
                            } catch (err) {
                              console.error('Error accepting request:', err)
                            }
                          }}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token')
                              await axios.put(
                                `http://localhost:8001/api/friends/requests/${request._id}/reject`,
                                {},
                                { headers: { Authorization: `Bearer ${token}` }}
                              )
                              fetchFriendRequests()
                            } catch (err) {
                              console.error('Error rejecting request:', err)
                            }
                          }}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <FriendsList friends={friends} onStartChat={startChat} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard