// src/app/(dashboard)/feed/page.js
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PostCard from '@/components/features/posts/PostCard'
import PostComposer from '@/components/features/posts/PostComposer'
import RightSidebar from '@/components/layout/RightSidebar'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const observer = useRef()

  // Infinite Scroll: Tracks when the last post card enters the browser viewport
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1)
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, loadingMore, hasMore]
  )

  // Core API Integration matching your Go backend setup
  const fetchFeedPosts = async (pageNumber, isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true)
      else setLoadingMore(true)

      setError('')

      const response = await fetch(`http://localhost:8080/api/posts?page=${pageNumber}&limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to retrieve your social feed.')
      }

      const data = await response.json()
      const fetchedPosts = data || []

      setPosts((prevPosts) => {
        return isInitialFetch ? fetchedPosts : [...prevPosts, ...fetchedPosts]
      })

      // If the backend sends fewer items than our limit, we have hit the end of the line
      setHasMore(fetchedPosts.length === 10)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Triggers whenever the page number increments via scroll intersection
  useEffect(() => {
    fetchFeedPosts(page, page === 1)
  }, [page])

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev])
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* COMPOSER AT THE TOP */}
      <PostComposer onPostCreated={handlePostCreated} />

      {/* RIGHT SIDEBAR WITH TRENDS/SUGGESTIONS */}
      <RightSidebar />

      {error && (
        <div className="error-state">
          {error}
        </div>
      )}

      {/* FEED CONTEXT STREAM */}
      <div className="space-y-4">
        {loading ? (
          /* LOADING SKELETON STATE */
          [1, 2, 3].map((n) => (
            <div key={n} className="post-card animate-pulse">
              <div className="post-header">
                <div className="post-author">
                  <div className="post-avatar skeleton rounded-full"></div>
                  <div className="post-author-info">
                    <div className="skeleton h-4 w-32 rounded"></div>
                    <div className="skeleton h-3 w-24 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="post-content">
                <div className="skeleton h-4 w-full rounded mb-2"></div>
                <div className="skeleton h-4 w-5/6 rounded"></div>
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          /* EMPTY STATE */
          <div className="post-card empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 className="empty-state-title">Your feed is quiet right now</h3>
            <p className="empty-state-description">Follow people to see posts here!</p>
          </div>
        ) : (
          /* LIVE POSTS STREAM */
          posts.map((post, index) => {
            if (posts.length === index + 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <PostCard post={post} />
                </div>
              )
            } else {
              return <PostCard key={post.id} post={post} />
            }
          })
        )}

        {/* LOADING MORE FOOTER SKELETON */}
        {loadingMore && (
          <div className="animate-pulse p-4 text-center text-sm text-blue-500">
            Loading older updates...
          </div>
        )}
      </div>
    </div>
  )
}
