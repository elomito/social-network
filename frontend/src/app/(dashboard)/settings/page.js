'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Avatar from '@/components/ui/Avatar'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    email: '',
    firstName: '',
    lastName: '',
    nickname: '',
    aboutMe: '',
    isPublic: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const { user, logout } = useAuth()

  useEffect(() => {
    const fetchSettings = async () => {
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

        if (!response.ok) throw new Error('Failed to load settings')

        const data = await response.json()
        setSettings({
          email: data.email || '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          nickname: data.nickname || '',
          aboutMe: data.about_me || '',
          isPublic: data.is_public !== false,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [router])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: settings.firstName,
          last_name: settings.lastName,
          nickname: settings.nickname,
          about_me: settings.aboutMe,
          is_public: settings.isPublic,
        }),
      })

      if (!response.ok) throw new Error('Failed to update settings')

      setSuccess('Settings saved successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="h-8 w-32 rounded bg-gray-200 animate-pulse" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-10 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-4">
            <Avatar src={null} alt="Profile" fallback={settings.firstName?.[0] || 'U'} size="xl" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-500">Update your personal details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                disabled
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
              />
              <p className="mt-1.5 text-xs text-gray-400">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={settings.firstName}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={settings.lastName}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nickname</label>
              <input
                type="text"
                name="nickname"
                value={settings.nickname}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="How others see your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">About Me</label>
              <textarea
                name="aboutMe"
                value={settings.aboutMe}
                onChange={handleChange}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <input
                type="checkbox"
                name="isPublic"
                id="isPublic"
                checked={settings.isPublic}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make my profile public
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign out
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
