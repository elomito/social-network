'use client'

import React from 'react'

export default function CommentList({ comments, loading, error }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="animate-pulse rounded-lg border border-gray-100 bg-white p-4">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded bg-gray-200"></div>
                <div className="h-4 w-full rounded bg-gray-200"></div>
                <div className="h-4 w-5/6 rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white py-8 text-center">
        <p className="text-sm text-gray-500">No comments yet. Be the first to share your thoughts!</p>
      </div>
    )
  }

  // Sort comments chronologically (oldest first)
  const sortedComments = [...comments].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0)
    const dateB = new Date(b.created_at || b.createdAt || 0)
    return dateA - dateB
  })

  return (
    <div className="space-y-4">
      {sortedComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}

function CommentItem({ comment }) {
  const {
    authorName = 'Anonymous',
    authorAvatar,
    createdAt,
    content = '',
    imageUrl,
  } = comment

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now'

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex items-start space-x-3">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
            {authorName[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">{authorName}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
          <p className="mt-1 text-sm text-gray-800">{content}</p>
          {imageUrl && (
            <div className="mt-2 max-h-64 overflow-hidden rounded-lg border border-gray-100">
              <img src={imageUrl} alt="Comment attachment" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}