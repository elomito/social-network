'use client'

import React, { useState, useRef } from 'react'

export default function PostComposer({ onPostCreated }) {
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && !imageFile) return

    setSubmitting(true)
    setError('')

    try {
      let imageId = null

      if (imageFile) {
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

      const response = await fetch('http://localhost:8080/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          privacy_level: privacy,
          image_id: imageId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create post')
      }

      const data = await response.json()

      // Clear form
      setContent('')
      setPrivacy('public')
      clearImage()

      // Notify parent to refresh feed
      if (onPostCreated) {
        onPostCreated(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 shadow">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-sm font-bold text-white">
          Me
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            disabled={submitting}
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-3">
              <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1.5 text-white transition hover:bg-gray-900/80"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {error && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={submitting}
                />
              </label>

              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={submitting}
              >
                <option value="public">🌍 Public</option>
                <option value="friends">👥 Friends</option>
                <option value="private">🔒 Private</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || (!content.trim() && !imageFile)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
