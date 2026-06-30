// src/app/(dashboard)/feed/page.js
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PostCard from '@/components/features/posts/PostCard'
import PostComposer from '@/components/features/posts/PostComposer'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const observer = useRef()

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

  const fetchFeedPosts = async (pageNumber, isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true)
      else setLoadingMore(true)

      setError('')

      const response = await fetch(`/api/posts?page=${pageNumber}&limit=10`, {
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

      setHasMore(fetchedPosts.length === 10)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchFeedPosts(page, page === 1)
  }, [page])

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev])
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Welcome back! 👋</h1>
          <p className="mt-1 text-blue-100">See what's happening in your network today.</p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute right-12 bottom-4 h-16 w-16 rounded-full bg-white/5" />
      </div>

      {/* COMPOSER */}
      <PostComposer onPostCreated={handlePostCreated} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* FEED */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-5/6 rounded bg-gray-200" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Your feed is quiet right now</h3>
            <p className="mt-1 text-sm text-gray-500">Follow people to see posts here!</p>
          </div>
        ) : (
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

        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading more posts...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
