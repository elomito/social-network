"use client";

import React, { useState, useEffect } from 'react';

export default function AudiencePicker({ privacy, onAudienceChange, onError }) {
  const [followers, setFollowers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch current followers matching your Go backend relationship endpoints
  useEffect(() => {
    if (privacy !== 'private') return;

    const fetchFollowers = async () => {
      try {
        setLoading(true);
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        const response = await fetch('http://localhost:8080/api/followers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to load followers list.');

        const data = await response.json();
        setFollowers(data.followers || []);
      } catch (err) {
        if (onError) onError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [privacy]);

  // 2. Bubble selection arrays back up to the main Composer state context
  useEffect(() => {
    if (privacy === 'private') {
      onAudienceChange(selectedFollowers.map(f => f.id));
      if (selectedFollowers.length === 0) {
        if (onError) onError('Private posts require at least one selected follower.');
      } else {
        if (onError) onError('');
      }
    } else {
      onAudienceChange([]); // Clear if toggled away
      if (onError) onError('');
    }
  }, [selectedFollowers, privacy]);

  // Only display component if privacy state is explicitly marked 'private'
  if (privacy !== 'private') return null;

  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedFollowers.some(selected => selected.id === follower.id)
  );

  const handleSelect = (follower) => {
    setSelectedFollowers([...selectedFollowers, follower]);
    setSearchQuery('');
  };

  const handleRemove = (followerId) => {
    setSelectedFollowers(selectedFollowers.filter(f => f.id !== followerId));
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 animate-fadeIn">
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Custom Private Audience Selection
      </label>

      {/* CONFIRMED AUDIENCE CHIPS LIST */}
      <div className="flex flex-wrap gap-1.5">
        {selectedFollowers.length === 0 ? (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
            ⚠️ Select at least one follower who can view this post.
          </span>
        ) : (
          selectedFollowers.map(follower => (
            <div key={follower.id} className="flex items-center space-x-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200">
              <span>{follower.username}</span>
              <button 
                type="button" 
                onClick={() => handleRemove(follower.id)}
                className="hover:text-blue-900 font-bold focus:outline-none ml-1 text-sm"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* SEARCHABLE MULTI-SELECT DROPDOWN INPUT */}
      <div className="relative">
        <input
          type="text"
          placeholder={loading ? "Loading your followers..." : "Search followers by nickname..."}
          disabled={loading}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
        />

        {searchQuery && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
            {filteredFollowers.length === 0 ? (
              <div className="p-2 text-xs text-gray-500 text-center">No matching followers found</div>
            ) : (
              filteredFollowers.map(follower => (
                <button
                  key={follower.id}
                  type="button"
                  onClick={() => handleSelect(follower)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-800 flex items-center justify-between transition"
                >
                  <span>{follower.username}</span>
                  <span className="text-gray-400 text-[10px]">Select</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
