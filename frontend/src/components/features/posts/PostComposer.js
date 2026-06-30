'use client'

import React, { useState, useRef } from 'react'
import Avatar from '@/components/ui/Avatar'

export default function PostComposer({ onPostCreated }) {
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target.value)
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
        const uploadResponse = await fetch('/api/images/upload', {
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

      const response = await fetch('/api/posts', {
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

      setContent('')
      setPrivacy('public')
      clearImage()
      setIsExpanded(false)

      if (onPostCreated) {
        onPostCreated(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFocus = () => {
    setIsExpanded(true)
  }

  const privacyOptions = [
    { value: 'public', label: '🌍 Public', desc: 'Everyone' },
    { value: 'friends', label: '👥 Friends', desc: 'Friends only' },
    { value: 'private', label: '🔒 Private', desc: 'Only me' },
  ]

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200">
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar src={null} alt="You" fallback="U" size="lg" />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={handleFocus}
              placeholder="What's on your mind?"
              rows={isExpanded ? 3 : 1}
              className="w-full resize-none rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={submitting}
            />

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mt-3">
                <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1.5 text-white transition hover:bg-gray-900/80"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {isExpanded && (
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-xl p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
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

                  <div className="relative">
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                      className="appearance-none rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 pr-8 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      disabled={submitting}
                    >
                      {privacyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isExpanded && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpanded(false)
                        setContent('')
                        clearImage()
                      }}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || (!content.trim() && !imageFile)}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Posting...
                      </span>
                    ) : (
                      'Post'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
