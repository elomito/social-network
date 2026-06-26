"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import FollowButton from '@/components/features/followers/FollowButton';

export default function ProfilePage() {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        // 1. Get profile data
        const response = await fetch(`http://localhost:8080/api/users/profile/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to load profile.');
        const data = await response.json();
        setProfileUser(data.user);
        
        // 2. Decode current user context safely (simulate ID extraction from token/auth context)
        // In your production app, this safely reads from your useAuth() hook
        setCurrentUserId("current-auth-user-id"); 
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm animate-pulse space-y-4">
        <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-12 text-gray-500">
        Profile entry could not be located.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold uppercase">
            {profileUser.username[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {profileUser.username}
              {profileUser.isPrivate && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">🔒 Private</span>}
            </h1>
            <p className="text-sm text-gray-500">{profileUser.fullName || 'Network Peer'}</p>
          </div>
        </div>

        {/* REUSABLE FOLLOW BUTTON HANDLING STATE OPTIMISTICALLY WITH ROLLBACK */}
        <FollowButton 
          targetUser={profileUser}
          currentUserId={currentUserId}
          onStateChange={(updatedState) => setProfileUser(updatedState)}
        />
      </div>

      <div className="flex space-x-6 border-t border-b border-gray-100 py-3 text-sm text-gray-600">
        <div><strong className="text-gray-900">{profileUser.followingCount || 0}</strong> Following</div>
        <div><strong className="text-gray-900">{profileUser.followersCount || 0}</strong> Followers</div>
      </div>
    </div>
  );
}
