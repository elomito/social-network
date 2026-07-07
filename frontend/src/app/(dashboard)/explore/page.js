"use client";

import React, { useState, useEffect } from 'react';

export default function ExplorePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loadingActionId, setLoadingActionId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('session_id='))
          ?.split('=')[1];

        // 1. Fetch current logged-in user context
        const meResponse = await fetch('http://localhost:8080/api/auth/me', {
          credentials: 'include', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          setCurrentUserId(meData.id || meData.userId);
        }

        // 2. Fetch all discoverable profiles across the network
        const response = await fetch('http://localhost:8080/api/users/discover', {
          method: 'GET', credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to retrieve explore network data.');
        const data = await response.json();
        
        const userList = Array.isArray(data) ? data : data.users || [];
        setUsers(userList);
      } catch (err) {
        console.error("Explore data error:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFollowAction = async (targetUser) => {
    const targetId = targetUser.id || targetUser.userId;
    try {
      setLoadingActionId(targetId);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('session_id='))
        ?.split('=')[1];

      let endpoint = `/api/follow/${targetId}`;
      if (targetUser.isFollowing || targetUser.is_following) {
        endpoint = `/api/unfollow/${targetId}`;
      } else if (targetUser.isRequested || targetUser.is_requested) {
        endpoint = `/api/follow-requests/cancel/${targetId}`;
      }

      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Follow action failed.');

      // Update state internally inside the list feed instantly
      setUsers(prev => prev.map(u => {
        const uId = u.id || u.userId;
        if (uId === targetId) {
          const isFollowingNow = !(u.isFollowing || u.is_following);
          return {
            ...u,
            isFollowing: isFollowingNow,
            is_following: isFollowingNow
          };
        }
        return u;
      }));
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingActionId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if ((user.id || user.userId) === currentUserId) return false; // hide self from explore
    const username = (user.username || '').toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const matchTerm = searchQuery.toLowerCase();
    return username.includes(matchTerm) || fullName.includes(matchTerm);
  });

  // Acceptance Criteria: Loading States Handled
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-4 border border-gray-100 bg-white rounded-xl h-24 animate-pulse flex space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Acceptance Criteria: Error States Handled
  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <p className="text-sm font-semibold text-red-700">Error loading explore content</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <span>🌐</span> Explore Network
        </h1>
        <p className="text-xs text-gray-500 mt-1">Discover peers, colleagues, and creators across the platform.</p>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search profiles by name or handle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Acceptance Criteria: Loads data and handles layout items successfully */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
          <p className="text-sm font-medium text-gray-400">No profiles located</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map((user) => {
            const uId = user.id || user.userId;
            const isFollowing = user.isFollowing || user.is_following;
            return (
              <div key={uId} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                    {(user.first_name?.[0] || user.username?.[0] || 'U')}
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {user.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Network Peer'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loadingActionId === uId}
                  onClick={() => handleFollowAction(user)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loadingActionId === uId ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
