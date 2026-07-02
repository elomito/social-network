'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PostCard from '@/components/features/posts/PostCard'
import CommentList from '@/components/features/posts/CommentList'
import { getPost, getComments, createComment, uploadImage } from '@/lib/apiClient'
import { getTokenFromCookie } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

const COMMENTS_PER_PAGE = 20

export default function PostDetailPage() {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentImage, setCommentImage] = useState(null)
  const [commentImagePreview, setCommentImagePreview] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')

  useEffect(() => {
    if (!postId) return

    let cancelled = false

    async function fetchPostAndComments() {
      try {
        setLoading(true)
        setError('')

        const [postData, commentsData] = await Promise.all([
          getPost(postId),
          getComments(postId, { limit: COMMENTS_PER_PAGE, offset: 0 })
        ])

        if (cancelled) return

        setPost(postData)
        setComments(commentsData || [])
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load post.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchPostAndComments()
    return () => {
      cancelled = true
    }
  }, [postId])

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim() && !commentImage) return

    setCommentSubmitting(true)
    setCommentError('')

    try {
      let imageUrl = null
      if (commentImage) {
        const uploadData = await uploadImage(commentImage)
        imageUrl = uploadData.image_url
      }

      const data = await createComment(postId, {
        content: commentText.trim(),
        image_url: imageUrl,
      })

      setComments((prev) => [...prev, data])
      setPost((prev) => (prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev))
      setCommentText('')
      setCommentImage(null)
      setCommentImagePreview('')
    } catch (err) {
      setCommentError(err?.response?.data?.message || 'Failed to post comment')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleCommentImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCommentImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setCommentImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearCommentImage = () => {
    setCommentImage(null)
    setCommentImagePreview('')
  }

  const handleCommentAdded = (newComment) => {
    setComments((prev) => [...prev, newComment])
    setPost((prev) => (prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 rounded bg-gray-200" />
                <div className="h-3 w-1/6 rounded bg-gray-200" />
              </div>
            </div>
            <div className="mt-4 h-4 w-full rounded bg-gray-200" />
            <div className="mt-2 h-4 w-5/6 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error || 'Post not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <PostCard
        post={post}
        commentPreview={comments.slice(0, 3)}
        onCommentAdded={(postId, newComment) => {
          setComments((prev) => [...prev, newComment])
          setPost((prev) =>
            prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev
          )
        }}
      />

      {/* Comment Form */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Leave a comment</h3>
          <form onSubmit={handleCommentSubmit}>
            <div className="flex gap-3">
              <Avatar src={null} alt="You" fallback="U" size="md" />
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="What are your thoughts?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={commentSubmitting}
                />

                {/* Image preview */}
                {commentImagePreview && (
                  <div className="relative mt-3">
                    <img
                      src={commentImagePreview}
                      alt="Preview"
                      className="max-h-48 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearCommentImage}
                      className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1.5 text-white transition hover:bg-gray-900/80"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {commentError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {commentError}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <label className="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCommentImageChange}
                      className="hidden"
                      disabled={commentSubmitting}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={commentSubmitting || (!commentText.trim() && !commentImage)}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {commentSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Posting...
                      </span>
                    ) : (
                      'Comment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Comments List */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            {post.commentsCount || comments.length} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
          </h3>
          <CommentList
            key={postId}
            comments={comments}
            postId={postId}
            totalCount={post.commentsCount}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </div>
    </div>
  )
}
