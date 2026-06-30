'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Get current user ID
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

        // Get user profile
        const response = await fetch(`http://localhost:8080/api/users?id=${currentUserId}`, {
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
      const response = await fetch('http://localhost:8080/api/users', {
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
    try {
      await fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/auth/login')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto mt-8 max-w-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="h-10 rounded bg-gray-200"></div>
          <div className="h-10 rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              disabled
              className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={settings.firstName}
                onChange={handleChange}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="flex items-center gap-2">
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Log Out
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
