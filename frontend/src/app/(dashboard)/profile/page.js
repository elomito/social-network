'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import PostCard from '@/components/features/posts/PostCard'
import {
  followUser,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
  unfollowUser,
} from '@/lib/apiClient'

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'followers', label: 'Followers' },
  { id: 'following', label: 'Following' },
]

function normalizeUsers(data, key) {
  const users = data?.[key] || data || []
  return Array.isArray(users) ? users : []
}

function UserList({ users, emptyMessage, type, onFollow, onUnfollow, actionUserId }) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {users.map((user) => {
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
        const username = user.username || user.nickname || displayName || 'Network Peer'
        const isFollowing = user.isFollowing ?? user.is_following ?? false
        const isBusy = actionUserId === user.id

        return (
          <div
            key={user.id}
            className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 transition last:border-b-0 hover:bg-gray-50"
          >
            <Link href={`/profile/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar src={user.avatar_url} name={displayName || username} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {displayName || username}
                </p>
                <p className="truncate text-xs text-gray-500">@{username}</p>
              </div>
            </Link>

            {type === 'followers' && !isFollowing && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onFollow(user)}
                className="shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? 'Following...' : 'Follow back'}
              </button>
            )}

            {type === 'following' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onUnfollow(user)}
                className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? 'Unfollowing...' : 'Unfollow'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [tabError, setTabError] = useState('')
  const [actionUserId, setActionUserId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
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

        const [response, postsData, followersData, followingData] = await Promise.all([
          fetch(`/api/users?id=${currentUserId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }),
          getUserPosts(currentUserId),
          getUserFollowers(),
          getUserFollowing(),
        ])

        if (!response.ok) throw new Error('Failed to load profile.')
        const data = await response.json()
        const profilePosts = postsData?.posts || postsData || []
        const followerUsers = normalizeUsers(followersData, 'followers')
        const followingUsers = normalizeUsers(followingData, 'following')

        setProfile({
          id: data.id,
          username: data.nickname || `${data.first_name} ${data.last_name}`,
          fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          isPrivate: !data.is_public,
          followingCount: data.followingCount ?? followingUsers.length,
          followersCount: data.followersCount ?? followerUsers.length,
          isFollowing: false,
          isOwner: true,
          firstName: data.first_name,
          lastName: data.last_name,
          nickname: data.nickname,
          aboutMe: data.about_me,
          isPublic: data.is_public,
        })
        setPosts(Array.isArray(profilePosts) ? profilePosts : [])
        setFollowers(followerUsers)
        setFollowing(followingUsers)
        setCurrentUserId(meData.user_id)

        setEditData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          nickname: data.nickname || '',
          aboutMe: data.about_me || '',
          isPublic: data.is_public !== false,
        })
      } catch (err) {
        console.error(err.message)
        setTabError('Some profile activity could not be loaded.')
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

  const handleFollowFromList = async (user) => {
    if (!user?.id || actionUserId) return

    setActionUserId(user.id)
    setTabError('')
    try {
      await followUser(user.id)

      setFollowers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isFollowing: true, is_following: true } : item
        )
      )
      setFollowing((prev) => {
        if (prev.some((item) => item.id === user.id)) return prev
        return [{ ...user, isFollowing: true, is_following: true }, ...prev]
      })
      setProfile((prev) => ({
        ...prev,
        followingCount: (prev.followingCount || 0) + 1,
      }))
    } catch (err) {
      setTabError(err?.response?.data?.message || 'Failed to follow this user.')
    } finally {
      setActionUserId('')
    }
  }

  const handleUnfollowFromList = async (user) => {
    if (!user?.id || actionUserId) return

    setActionUserId(user.id)
    setTabError('')
    try {
      await unfollowUser(user.id)

      setFollowing((prev) => prev.filter((item) => item.id !== user.id))
      setFollowers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isFollowing: false, is_following: false } : item
        )
      )
      setProfile((prev) => ({
        ...prev,
        followingCount: Math.max(0, (prev.followingCount || 0) - 1),
      }))
    } catch (err) {
      setTabError(err?.response?.data?.message || 'Failed to unfollow this user.')
    } finally {
      setActionUserId('')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">
        Profile entry could not be located.
      </div>
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
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
          >
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

        {/* Stats
        <div className="mt-6 flex justify-center gap-8 border-t border-gray-100 pt-6 sm:justify-start">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-gray-900">{profile.followingCount || 0}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-gray-900">{profile.followersCount || 0}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
        </div> */}

        {/* Bio */}
        {profile.aboutMe && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">About</h3>
            <p className="mt-1 text-sm text-gray-600">{profile.aboutMe}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
          {TABS.map((tab) => {
            const count =
              tab.id === 'posts'
                ? posts.length
                : tab.id === 'followers'
                  ? profile.followersCount || followers.length
                  : profile.followingCount || following.length

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={activeTab === tab.id ? 'ml-2 text-blue-100' : 'ml-2 text-gray-400'}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {tabError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {tabError}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onPostDeleted={(postId) => {
                    setPosts((prev) => prev.filter((p) => p.id !== postId))
                  }}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                  You have not shared any posts yet.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <UserList
            users={followers}
            emptyMessage="No followers yet."
            type="followers"
            onFollow={handleFollowFromList}
            actionUserId={actionUserId}
          />
        )}

        {activeTab === 'following' && (
          <UserList
            users={following}
            emptyMessage="You are not following anyone yet."
            type="following"
            onUnfollow={handleUnfollowFromList}
            actionUserId={actionUserId}
          />
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
