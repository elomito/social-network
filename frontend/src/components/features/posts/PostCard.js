// src/components/features/posts/PostCard.js
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { getTokenFromCookie } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

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

    if (optimisticReaction === reactionType) {
      setOptimisticReaction(null)
      setOptimisticLikes(optimisticLikes - 1)
    } else if (optimisticReaction) {
      setOptimisticReaction(reactionType)
      setOptimisticLikes(optimisticLikes + (reactionType === 'like' ? 1 : -1))
    } else {
      setOptimisticReaction(reactionType)
      setOptimisticLikes(optimisticLikes + 1)
    }

    try {
      const token = getTokenFromCookie()
      const method = optimisticReaction === reactionType ? 'DELETE' : 'POST'

      const response = await fetch(`/api/posts/${postId}/reactions`, {
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
      setOptimisticReaction(previousReaction)
      setOptimisticLikes(previousLikes)
    } finally {
      setReactionLoading(false)
    }
  }

  const privacyColors = {
    public: 'bg-green-100 text-green-700',
    friends: 'bg-blue-100 text-blue-700',
    private: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar src={authorAvatar} alt={authorName} fallback={authorName[0]?.toUpperCase()} size="lg" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{authorName}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${privacyColors[privacy] || privacyColors.public}`}>
                {privacy}
              </span>
            </div>
          </div>
        </div>
        <button className="rounded-lg p-2 text-gray-400 opacity-0 transition-all group-hover:bg-gray-100 group-hover:opacity-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{content}</p>
      </div>

      {/* Image */}
      {imageUrl && (
        <div className="px-4 pb-3">
          <div className="overflow-hidden rounded-xl">
            <img
              src={imageUrl}
              alt="Post attachment"
              className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
        <button
          onClick={() => handleReaction('like')}
          disabled={reactionLoading}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
            optimisticReaction === 'like'
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
          }`}
        >
          <svg className="h-5 w-5" fill={optimisticReaction === 'like' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.083 5.058 9.083h1.051c.491 0 .937.238 1.204.612.27.375.436.851.436 1.355 0 .085-.01.17-.029.252M12 15.75c-1.148 0-2.25-.47-3.06-1.3a4.501 4.501 0 00-1.08-1.08" />
          </svg>
          <span>{optimisticLikes}</span>
        </button>

        <Link
          href={`/post/${postId}`}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-blue-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <span>{commentsCount}</span>
        </Link>

        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-green-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  )
}
