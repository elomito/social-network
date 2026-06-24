"use client";

import React, { useState, useEffect } from 'react';
import PostCard from '@/components/features/posts/PostCard';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Mock initial loading effect for skeleton requirement
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* COMPOSER PLACEHOLDER (#68) */}
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <p className="text-gray-400 text-sm">What's on your mind? (Composer UI Placeholder)</p>
      </div>

      {/* FEED CONTAINER */}
      <div className="space-y-4">
        {loading ? (
          /* LOADING SKELETON STATE */
          [1, 2, 3].map((n) => (
            <div key={n} className="p-6 bg-white rounded-lg shadow animate-pulse space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ))
        ) : posts.length === 0 ? (
          /* EMPTY STATE */
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100">
            <p className="text-gray-500 text-lg font-medium">Your feed is quiet right now.</p>
            <p className="text-gray-400 text-sm mt-1">Follow people to see posts here!</p>
          </div>
        ) : (
          /* LIVE POSTS LIST */
          posts.map((post) => (
            <div key={post.id} className="p-4 bg-white rounded-lg shadow">
              <p className="text-black">Post content placeholder</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
