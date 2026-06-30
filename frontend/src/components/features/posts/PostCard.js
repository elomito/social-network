// src/components/features/posts/PostCard.js
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { getTokenFromCookie } from '@/lib/utils'

export default function PostCard({ post, onReactionChange }) {
  const {
    authorName = 'Anonymous User',
    authorAvatar,
    createdAt,
    content = '',
    imageUrl,
    privacy = 'public',
    likesCount = 0,
    commentsCount = 0,
    id: postId,
    userReaction,
  } = post

  const [optimisticLikes, setOptimisticLikes] = useState(likesCount)
  const [optimisticReaction, setOptimisticReaction] = useState(userReaction || null)
  const [reactionLoading, setReactionLoading] = useState(false)

  // Format timestamp to look clean (e.g., "Jun 24, 2026")
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Just now'

  const handleReaction = async (reactionType) => {
    if (reactionLoading) return

    setReactionLoading(true)
    const previousReaction = optimisticReaction
    const previousLikes = optimisticLikes

    // Optimistic update
    if (optimisticReaction === reactionType) {
      // Removing reaction
      setOptimisticReaction(null)
      setOptimisticLikes(optimisticLikes - 1)
    } else if (optimisticReaction) {
      // Changing reaction
      setOptimisticReaction(reactionType)
      setOptimisticLikes(optimisticLikes + (reactionType === 'like' ? 1 : -1))
    } else {
      // Adding new reaction
      setOptimisticReaction(reactionType)
      setOptimisticLikes(optimisticLikes + 1)
    }

    try {
      const token = getTokenFromCookie()
      const method = optimisticReaction === reactionType ? 'DELETE' : 'POST'

      const response = await fetch(`http://localhost:8080/api/posts/${postId}/reactions`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ reaction_type: reactionType })
      })

      if (!response.ok) {
        throw new Error('Failed to update reaction')
      }

      if (onReactionChange) {
        onReactionChange(postId, optimisticReaction === reactionType ? null : reactionType)
      }
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticReaction(previousReaction)
      setOptimisticLikes(previousLikes)
    } finally {
      setReactionLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow">
      {/* HEADER SECTION: Author, Timestamp, Privacy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 font-bold text-gray-600">
              {authorName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{authorName}</h4>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-gray-600">
                {privacy}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* BODY SECTION: Post Text Content */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{content}</p>
      {/* OPTIONAL IMAGE ATTACHMENT */}
      {imageUrl && (
        <div className="mt-2 max-h-96 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
          <img src={imageUrl} alt="Post attachment" className="h-full w-full object-cover" />
        </div>
      )}
      {/* FOOTER SECTION: Interaction Entry Points */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm text-gray-500">
        <button
          onClick={() => handleReaction('like')}
          disabled={reactionLoading}
          className="flex items-center space-x-2 transition ${optimisticReaction === 'like' ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}"
        >
          <span>👍</span>
          <span className="text-xs font-medium">{optimisticLikes} Likes</span>
        </button>

        <Link
          href={`/post/${postId}`}
          className="flex items-center space-x-2 transition hover:text-blue-600"
        >
          <span>💬</span>
          <span className="text-xs font-medium">{commentsCount} Comments</span>
        </Link>
      </div>
    </div>
  )
}
