const FriendsList = ({ friends, onStartChat }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Friends ({friends.length})
      </h2>
      
      {friends.length === 0 ? (
        <p className="text-gray-500">No friends yet. Search for users to add them!</p>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend._id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                {friend.avatar && (
                  <img
                    src={friend.avatar}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{friend.username}</p>
                  <p className="text-sm text-gray-500">{friend.email}</p>
                  {friend.bio && (
                    <p className="text-sm text-gray-600 mt-1">{friend.bio}</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => onStartChat(friend._id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Chat
                </button>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="ml-2 text-sm text-gray-500">
                    {friend.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FriendsList