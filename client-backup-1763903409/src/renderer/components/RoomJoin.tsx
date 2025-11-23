import React, { useState } from 'react';
import { createRoom, joinRoom, getLiveKitUrl } from '../services/apiService';
import { useLiveKit } from '../hooks/useLiveKit';

const RoomJoin: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { connect, isConnected, error } = useLiveKit();

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const { roomId: newRoomId, token } = await createRoom();
      const url = await getLiveKitUrl();
      await connect(url, token);
      setRoomId(newRoomId);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      return;
    }
    setIsJoining(true);
    try {
      const { token } = await joinRoom(roomId);
      const url = await getLiveKitUrl();
      await connect(url, token);
    } catch (err) {
      console.error('Failed to join room:', err);
    } finally {
      setIsJoining(false);
    }
  };

  if (isConnected) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800">Connected to room: {roomId}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Join or Create Room</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
            Room ID
          </label>
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID or leave empty to create"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleJoinRoom}
            disabled={!roomId.trim() || isJoining}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomJoin;

