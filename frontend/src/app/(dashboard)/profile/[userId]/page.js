"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ProfilePage() {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        const response = await fetch(`http://localhost:8080/api/users/profile/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to load profile.');
        const data = await response.json();
        
        // Normalize backend fields so frontend state properties are always set properly
        const userPayload = data.user || data;
        const normalizedUser = {
          ...userPayload,
          followersCount: userPayload.followersCount ?? userPayload.followers_count ?? 0,
          followingCount: userPayload.followingCount ?? userPayload.following_count ?? 0,
          isFollowing: userPayload.isFollowing ?? userPayload.is_following ?? false,
          isRequested: userPayload.isRequested ?? userPayload.is_requested ?? false,
          isPrivate: userPayload.isPrivate ?? userPayload.is_private ?? false,
          isOwner: userPayload.is_owner ?? userPayload.isOwner ?? false
        };

        setProfileUser(normalizedUser);
      } catch (err) {
        console.error("Sync payload error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchProfile();
  }, [userId]);

  const handleFollowAction = async () => {
    try {
      setLoadingAction(true);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      let endpoint = `/api/follow/${userId}`;
      if (profileUser.isFollowing) {
        endpoint = `/api/unfollow/${userId}`;
      } else if (profileUser.isRequested) {
        endpoint = `/api/follow-requests/cancel/${userId}`;
      }

      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Action execution failed.');

      // UI Acceptance Criteria: State updates accurately and immediately after follow/unfollow actions
      setProfileUser(prev => {
        if (prev.isFollowing) {
          return { ...prev, isFollowing: false, followersCount: Math.max(0, prev.followersCount - 1) };
        } else if (prev.isRequested) {
          return { ...prev, isRequested: false };
        } else {
          if (prev.isPrivate) return { ...prev, isRequested: true };
          return { ...prev, isFollowing: true, followersCount: prev.followersCount + 1 };
        }
      });
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const onToggle = async () => {
    if (!profileUser?.isOwner || toggling) return;
    setToggling(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const nextVisibility = !profileUser.isPrivate;

      const res = await fetch('http://localhost:8080/api/users/visibility', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_public: !nextVisibility }),
      });

      if (!res.ok) throw new Error('Failed to update visibility');
      
      setProfileUser(prev => ({ ...prev, isPrivate: nextVisibility }));
    } catch (err) {
      alert('Failed to update visibility');
      console.error(err.message);
    } finally {
      setToggling(false);
    }
  };

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
            {(profileUser.first_name?.[0] || profileUser.username?.[0] || 'U')}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              {profileUser.first_name} {profileUser.last_name}
              {profileUser.isPrivate && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">🔒 Private</span>}
            </h1>
            <div className="text-sm text-gray-500">@{profileUser.nickname || profileUser.username}</div>
          </div>
        </div>

        {profileUser.isOwner ? (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Public</label>
            <button onClick={onToggle} disabled={toggling} className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition">
              {!profileUser.isPrivate ? '🔓' : '🔒'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={loadingAction}
            onClick={handleFollowAction}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
              profileUser.isFollowing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : profileUser.isRequested
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loadingAction ? '...' : profileUser.isFollowing ? 'Unfollow' : profileUser.isRequested ? 'Requested' : 'Follow'}
          </button>
        )}
      </div>

      {profileUser.about_me ? (
        <div className="mt-4 text-gray-800 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{profileUser.about_me}</div>
      ) : (
        <div className="mt-4 text-gray-400 text-sm italic">No bio provided.</div>
      )}

      {/* Synchronized counters display */}
      <div className="flex space-x-6 border-t border-b border-gray-100 py-3 text-sm text-gray-600">
        <div><strong className="text-gray-900">{profileUser.followingCount}</strong> Following</div>
        <div><strong className="text-gray-900">{profileUser.followersCount}</strong> Followers</div>
      </div>
    </div>
  );
}
