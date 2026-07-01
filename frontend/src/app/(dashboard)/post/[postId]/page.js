'use client'

import React, { useState, useEffect, use } from 'react'
import PostCard from '@/components/features/posts/PostCard'
import CommentList from '@/components/features/posts/CommentList'
import { getPost, getComments, createComment, uploadImage } from '@/lib/apiClient'

export default function PostDetailPage({ params }) {
  const { postId } = use(params)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingComments, setLoadingComments] = useState(true)
  const [error, setError] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [optimisticComments, setOptimisticComments] = useState([])

  useEffect(() => {
    if (!postId) return

    const fetchPostAndComments = async () => {
      try {
        setLoading(true)
        setLoadingComments(true)
        setError('')
        setCommentsError('')

        const postData = await getPost(postId)
        setPost(postData)

        const commentsData = await getComments(postId)
        setComments(commentsData || [])
      } catch (err) {
        const status = err?.response?.status
        if (status === 403) {
          setError('You do not have permission to view this post')
        } else if (status === 404) {
          setError('Post not found')
        } else {
          setError(err?.response?.data?.message || 'Failed to load post')
        }
      } finally {
        setLoading(false)
        setLoadingComments(false)
      }
    }

    fetchPostAndComments()
  }, [postId])

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() && !imageFile && !gifUrl) return

    setSubmitting(true)

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      authorName: 'You',
      content: newComment,
      imageUrl: imagePreview || gifUrl,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    }

    setOptimisticComments((prev) => [...prev, optimisticComment])
    setComments((prev) => [...prev, optimisticComment])

    const commentText = newComment
    setNewComment('')
    setImageFile(null)
    setImagePreview('')
    setGifUrl('')

    try {
      let imageUrl = null
      if (imageFile) {
        try {
          const uploadData = await uploadImage(imageFile)
          imageUrl = uploadData.image_url
        } catch (err) {
          // Image upload failed, continue without image
          console.error('Failed to upload image:', err)
        }
      }

      const data = await createComment(postId, {
        content: commentText,
        image_url: imageUrl,
      })

      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setComments((prev) =>
        prev
          .map((c) => (c.id === optimisticComment.id ? data : c))
          .filter((c) => c.id !== optimisticComment.id || c.isOptimistic)
      )

      if (post) {
        setPost((prev) => ({
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1,
        }))
      }
    } catch (err) {
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setCommentsError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const allComments = [...comments, ...optimisticComments]

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="animate-pulse space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-gray-200" />
              <div className="h-3 w-1/6 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m0 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Post not found</h3>
          <p className="mt-1 text-sm text-gray-500">This post may have been removed or is private.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <PostCard post={post} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Comments ({allComments.length})
          </h3>
        </div>

        {commentsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {commentsError}
          </div>
        )}

        <CommentList comments={allComments} loading={loadingComments} error="" />
      </div>

      <CommentComposer
        newComment={newComment}
        setNewComment={setNewComment}
        imagePreview={imagePreview}
        imageFile={imageFile}
        setImagePreview={setImagePreview}
        setImageFile={setImageFile}
        gifUrl={gifUrl}
        setGifUrl={setGifUrl}
        onSubmit={handleCommentSubmit}
        submitting={submitting}
      />
    </div>
  )
}

function CommentComposer({
  newComment,
  setNewComment,
  imagePreview,
  imageFile,
  setImagePreview,
  setImageFile,
  gifUrl,
  setGifUrl,
  onSubmit,
  submitting,
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <form onSubmit={onSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={submitting}
        />

        {imagePreview && (
          <div className="relative mt-3">
            <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => {
                setImagePreview('')
                setImageFile(null)
              }}
              className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1.5 text-white transition hover:bg-gray-900/80"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {gifUrl && (
          <div className="relative mt-3">
            <img src={gifUrl} alt="GIF Preview" className="max-h-48 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setGifUrl('')}
              className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1.5 text-white transition hover:bg-gray-900/80"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    setImageFile(file)
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      setImagePreview(event.target.result)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="hidden"
                disabled={submitting}
              />
            </label>
            <span className="text-xs text-gray-300">|</span>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              GIF
              <input
                type="url"
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="https://giphy.com/..."
                className="w-32 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || (!newComment.trim() && !imagePreview && !gifUrl)}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
          >
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}
