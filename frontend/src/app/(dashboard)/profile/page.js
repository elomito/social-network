'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/utils'

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
  const router = useRouter()

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        // First get current user ID
        const meResponse = await fetch('http://localhost:8080/api/auth/me', {
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

        // Then get profile data
        const response = await fetch(`http://localhost:8080/api/users?id=${currentUserId}`, {
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
    try {
      const response = await fetch('http://localhost:8080/api/users', {
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

      if (!response.ok) throw new Error('Failed to update profile')

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
      setIsEditing(false)
    } catch (err) {
      console.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto mt-8 max-w-2xl animate-pulse space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="h-20 w-20 rounded-full bg-gray-200"></div>
        <div className="h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-12 text-center text-gray-500">Profile entry could not be located.</div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-2xl font-bold uppercase text-white">
            {profile.username[0]}
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              {profile.username}
              {profile.isPrivate && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  🔒 Private
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">{profile.fullName || 'Network Peer'}</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Edit Profile
        </button>
      </div>

      <div className="flex space-x-6 border-b border-t border-gray-100 py-3 text-sm text-gray-600">
        <div>
          <strong className="text-gray-900">{profile.followingCount || 0}</strong> Following
        </div>
        <div>
          <strong className="text-gray-900">{profile.followersCount || 0}</strong> Followers
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit Profile</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How others see your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">About Me</label>
                <textarea
                  value={editData.aboutMe}
                  onChange={(e) => setEditData({ ...editData, aboutMe: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex items-center gap-2">
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
