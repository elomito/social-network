'use client'

import React, { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import { createComment, uploadImage } from '@/lib/apiClient'

export default function CommentList({ comments, loading, error, onReplyAdded }) {
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
        <CommentItem key={comment.id} comment={comment} onReplyAdded={onReplyAdded} />
      ))}
    </div>
  )
}

function CommentItem({ comment, onReplyAdded }) {
  const { authorName = 'Anonymous', authorAvatar, createdAt, content = '', imageUrl, isOptimistic, post_id, id: commentId } = comment

  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyImage, setReplyImage] = useState(null)
  const [replyImagePreview, setReplyImagePreview] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now'

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyText.trim() && !replyImage) return

    setReplySubmitting(true)
    setReplyError('')

    try {
      let imageUrl = null
      if (replyImage) {
        const uploadData = await uploadImage(replyImage)
        imageUrl = uploadData.image_url
      }

      const data = await createComment(post_id, {
        content: replyText.trim(),
        image_url: imageUrl,
        parent_id: commentId,
      })

      setReplyText('')
      setReplyImage(null)
      setReplyImagePreview('')
      setShowReplyForm(false)

      if (onReplyAdded) {
        onReplyAdded(post_id, data)
      }
    } catch (err) {
      setReplyError(err?.response?.data?.message || 'Failed to post reply')
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleReplyImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReplyImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setReplyImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearReplyImage = () => {
    setReplyImage(null)
    setReplyImagePreview('')
  }

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

          {/* Reply button */}
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className={`mt-3 text-xs font-medium transition-colors ${
              showReplyForm
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            {showReplyForm ? 'Cancel reply' : 'Reply'}
          </button>

          {/* Inline Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="mt-3">
              <div className="flex gap-3">
                <Avatar src={null} alt="You" fallback="U" size="sm" />
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled={replySubmitting}
                  />

                  {/* Image preview */}
                  {replyImagePreview && (
                    <div className="relative mt-3">
                      <img src={replyImagePreview} alt="Preview" className="max-h-48 rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={clearReplyImage}
                        className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1.5 text-white transition hover:bg-gray-900/80"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {replyError && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                      {replyError}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <label className="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReplyImageChange}
                        className="hidden"
                        disabled={replySubmitting}
                      />
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReplyForm(false)
                          setReplyText('')
                          setReplyImage(null)
                          setReplyImagePreview('')
                          setReplyError('')
                        }}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={replySubmitting || (!replyText.trim() && !replyImage)}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                      >
                        {replySubmitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Replying...
                          </span>
                        ) : (
                          'Reply'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
