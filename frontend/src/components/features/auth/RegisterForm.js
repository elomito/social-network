'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    nickname: '',
    dateOfBirth: '',
    aboutMe: '',
    isPublic: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setToken } = useAuth()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validateForm = () => {
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address.')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return false
    }
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.')
      return false
    }
    if (!formData.dateOfBirth) {
      setError('Date of birth is required.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          nickname: formData.nickname || undefined,
          date_of_birth: formData.dateOfBirth,
          about_me: formData.aboutMe || undefined,
          is_public: formData.isPublic,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.errors
          ? Object.values(data.errors).join(', ')
          : data.message || 'Registration failed'
        throw new Error(errorMessage)
      }

      // Auto-login after registration
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      if (loginResponse.ok) {
        setToken('valid_session')
        router.push('/feed')
      } else {
        router.push('/auth/login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email Address</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
          placeholder="name@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Nickname (optional)</label>
        <input
          type="text"
          name="nickname"
          value={formData.nickname}
          onChange={handleChange}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="How others see your name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">About Me (optional)</label>
        <textarea
          name="aboutMe"
          value={formData.aboutMe}
          onChange={handleChange}
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <input
          type="checkbox"
          name="isPublic"
          id="isPublic"
          checked={formData.isPublic}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-700">
          Make my profile public
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating Account...
          </span>
        ) : (
          'Sign Up'
        )}
      </button>
    </form>
  )
}
