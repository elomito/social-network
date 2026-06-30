'use client'

import React, { useState, useEffect } from 'react'
import PostCard from '@/components/features/posts/PostCard'
import CommentList from '@/components/features/posts/CommentList'

export default function PostDetailPage({ params }) {
  const { postId } = params
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

  // Fetch post and comments
  useEffect(() => {
    if (!postId) return

    const fetchPostAndComments = async () => {
      try {
        setLoading(true)
        setLoadingComments(true)
        setError('')
        setCommentsError('')

        // Fetch post
        const postResponse = await fetch(`http://localhost:8080/api/posts/${postId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!postResponse.ok) {
          if (postResponse.status === 403) {
            throw new Error('You do not have permission to view this post')
          }
          if (postResponse.status === 404) {
            throw new Error('Post not found')
          }
          throw new Error('Failed to load post')
        }

        const postData = await postResponse.json()
        setPost(postData)

        // Fetch comments
        const commentsResponse = await fetch(`http://localhost:8080/api/posts/${postId}/comments`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!commentsResponse.ok) {
          throw new Error('Failed to load comments')
        }

        const commentsData = await commentsResponse.json()
        setComments(commentsData || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setLoadingComments(false)
      }
    }

    fetchPostAndComments()
  }, [postId])

  // Handle comment submission with optimistic updates
  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() && !imageFile && !gifUrl) return

    setSubmitting(true)

    // Create optimistic comment
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      authorName: 'You',
      content: newComment,
      imageUrl: imagePreview || gifUrl,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    }

    // Add optimistic comment immediately
    setOptimisticComments((prev) => [...prev, optimisticComment])
    setComments((prev) => [...prev, optimisticComment])

    // Clear form
    const commentText = newComment
    setNewComment('')
    setImageFile(null)
    setImagePreview('')
    setGifUrl('')

    try {
      // Build request body - handle image upload if present
      let imageId = null
      if (imageFile) {
        // For now, we'll use a placeholder - in production this would upload to a service
        // The backend expects an image_id, not a URL
        const uploadResponse = await fetch('http://localhost:8080/api/images/upload', {
          method: 'POST',
          credentials: 'include',
          body: (() => {
            const formData = new FormData()
            formData.append('image', imageFile)
            return formData
          })(),
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          imageId = uploadData.id
        }
      }

      const response = await fetch(`http://localhost:8080/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: commentText,
          image_id: imageId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit comment')
      }

      const data = await response.json()

      // Replace optimistic comment with real one
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setComments((prev) =>
        prev
          .map((c) => (c.id === optimisticComment.id ? data : c))
          .filter((c) => c.id !== optimisticComment.id || c.isOptimistic)
      )

      // Update post comment count optimistically
      if (post) {
        setPost((prev) => ({
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1,
        }))
      }
    } catch (err) {
      // Revert optimistic update on failure
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setCommentsError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Combine real and optimistic comments
  const allComments = [...comments, ...optimisticComments]

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="animate-pulse space-y-4 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-gray-200"></div>
              <div className="h-3 w-1/6 rounded bg-gray-200"></div>
            </div>
          </div>
          <div className="h-4 w-full rounded bg-gray-200"></div>
          <div className="h-4 w-5/6 rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-lg border border-gray-100 bg-white p-4 text-center">
          <p className="text-gray-500">Post not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Post content */}
      <PostCard post={post} />

      {/* Comments section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Comments ({allComments.length})</h3>

        {commentsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {commentsError}
          </div>
        )}

        <CommentList comments={allComments} loading={loadingComments} error="" />
      </div>

      {/* Comment composer */}
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

// CommentComposer component - mirrors post composer functionality
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
      <form onSubmit={onSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows="3"
          className="w-full rounded border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mt-2">
            <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => {
                setImagePreview('')
                setImageFile(null)
              }}
              className="absolute right-1 top-1 rounded-full bg-gray-800 bg-opacity-50 px-1.5 py-0.5 text-xs text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* GIF preview */}
        {gifUrl && (
          <div className="relative mt-2">
            <img src={gifUrl} alt="GIF Preview" className="max-h-48 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setGifUrl('')}
              className="absolute right-1 top-1 rounded-full bg-gray-800 bg-opacity-50 px-1.5 py-0.5 text-xs text-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <label className="cursor-pointer text-xs text-gray-500 hover:text-blue-600">
              📎 Image
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
            <label className="text-xs text-gray-500">
              GIF URL:
              <input
                type="url"
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="https://giphy.com/..."
                className="ml-1 w-48 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting || (!newComment.trim() && !imagePreview && !gifUrl)}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}
