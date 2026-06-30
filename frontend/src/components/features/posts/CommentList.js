'use client'

import React from 'react'
import Avatar from '@/components/ui/Avatar'

export default function CommentList({ comments, loading, error }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-5/6 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">No comments yet</p>
        <p className="mt-1 text-xs text-gray-500">Be the first to share your thoughts!</p>
      </div>
    )
  }

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
  const { authorName = 'Anonymous', authorAvatar, createdAt, content = '', imageUrl, isOptimistic } = comment

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
    <div className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${isOptimistic ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar
          src={authorAvatar}
          alt={authorName}
          fallback={authorName[0]?.toUpperCase() || '?'}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{authorName}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">{formattedDate}</span>
            {isOptimistic && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Sending...
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-gray-800">{content}</p>
          {imageUrl && (
            <div className="mt-3 overflow-hidden rounded-xl">
              <img src={imageUrl} alt="Comment attachment" className="max-h-48 object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
