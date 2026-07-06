'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

export default function MyProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    aboutMe: '',
    isPublic: true,
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const router = useRouter()

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const meResponse = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!meResponse.ok) {
          router.push('/auth/login')
          return
        }

        const meData = await meResponse.json()
        const currentUserId = meData.user_id

        const response = await fetch(`/api/users?id=${currentUserId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) throw new Error('Failed to load profile.')
        const data = await response.json()

        setProfile({
          id: data.id,
          username: data.nickname || `${data.first_name} ${data.last_name}`,
          fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          isPrivate: !data.is_public,
          followingCount: 0,
          followersCount: 0,
          isFollowing: false,
          isOwner: true,
          firstName: data.first_name,
          lastName: data.last_name,
          nickname: data.nickname,
          aboutMe: data.about_me,
          isPublic: data.is_public,
        })

        setEditData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          nickname: data.nickname || '',
          aboutMe: data.about_me || '',
          isPublic: data.is_public !== false,
        })
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMyProfile()
  }, [router])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback({ type: '', message: '' })
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: editData.firstName,
          last_name: editData.lastName,
          nickname: editData.nickname,
          about_me: editData.aboutMe,
          is_public: editData.isPublic,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to update profile')
      }

      setProfile((prev) => ({
        ...prev,
        username: editData.nickname || `${editData.firstName} ${editData.lastName}`,
        fullName: `${editData.firstName} ${editData.lastName}`.trim(),
        isPrivate: !editData.isPublic,
        firstName: editData.firstName,
        lastName: editData.lastName,
        nickname: editData.nickname,
        aboutMe: editData.aboutMe,
        isPublic: editData.isPublic,
      }))
      setFeedback({ type: 'success', message: 'Profile updated successfully.' })
      setIsEditing(false)
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">Profile entry could not be located.</div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Cover Photo */}
      <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 sm:h-40">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
      </div>

      {/* Profile Info Card */}
      <div className="relative -mt-16 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {feedback.message && (
          <div className={`mb-4 rounded-xl border p-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {feedback.message}
          </div>
        )}
        <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
          <div className="relative -mt-16 sm:-mt-20">
            <Avatar
              src={null}
              alt={profile.username}
              fallback={profile.username[0]?.toUpperCase()}
              size="xl"
              className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28"
            />
            {profile.isPrivate && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
                🔒
              </span>
            )}
          </div>
          <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
            <p className="text-sm text-gray-500">{profile.fullName || 'Network Peer'}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 active:scale-95 sm:mt-0"
          >
            Edit Profile
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 flex justify-center gap-8 border-t border-gray-100 pt-6 sm:justify-start">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-gray-900">{profile.followingCount || 0}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-gray-900">{profile.followersCount || 0}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
        </div>

        {/* Bio */}
        {profile.aboutMe && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">About</h3>
            <p className="mt-1 text-sm text-gray-600">{profile.aboutMe}</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <p className="mt-1 text-sm text-gray-500">Update your personal information</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nickname</label>
                <input
                  type="text"
                  value={editData.nickname}
                  onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="How others see your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">About Me</label>
                <textarea
                  value={editData.aboutMe}
                  onChange={(e) => setEditData({ ...editData, aboutMe: e.target.value })}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={editData.isPublic}
                  onChange={(e) => setEditData({ ...editData, isPublic: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make my profile public
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
