"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PostCard from '@/components/features/posts/PostCard';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const observer = useRef();

  // Infinite Scroll: Tracks when the last post card enters the browser viewport
  const lastPostElementRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prevPage) => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Core API Integration matching your Go backend setup
  const fetchFeedPosts = async (pageNumber, isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true);
      else setLoadingMore(true);

      setError('');
      
      // Pull the auth token out of local cookie storage
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch(`http://localhost:8080/api/posts/feed?page=${pageNumber}&limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve your social feed.');
      }

      const data = await response.json();
      const fetchedPosts = data.posts || [];

      setPosts((prevPosts) => {
        return isInitialFetch ? fetchedPosts : [...prevPosts, ...fetchedPosts];
      });
      
      // If the backend sends fewer items than our limit, we have hit the end of the line
      setHasMore(fetchedPosts.length === 10);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Triggers whenever the page number increments via scroll intersection
  useEffect(() => {
    fetchFeedPosts(page, page === 1);
  }, [page]);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* COMPOSER AT THE TOP (#68) */}
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <p className="text-gray-400 text-sm">What's on your mind? (Composer UI Placeholder)</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* FEED CONTEXT STREAM */}
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
          /* LIVE POSTS STREAM */
          posts.map((post, index) => {
            if (posts.length === index + 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <PostCard post={post} />
                </div>
              );
            } else {
              return <PostCard key={post.id} post={post} />;
            }
          })
        )}

        {/* LOADING MORE FOOTER SKELETON */}
        {loadingMore && (
          <div className="p-4 text-center text-sm text-gray-500 animate-pulse">
            Loading older updates...
          </div>
        )}
      </div>
    </div>
  );
}
