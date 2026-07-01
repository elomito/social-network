'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register } from '@/lib/apiClient'

const initialValues = {
  first_name: '',
  last_name: '',
  email: '',
  date_of_birth: '',
  password: '',
  nickname: '',
  about_me: '',
}

function validate(values) {
  const errors = {}

  if (!values.first_name.trim()) errors.first_name = 'First name is required.'
  if (!values.last_name.trim()) errors.last_name = 'Last name is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!values.date_of_birth) errors.date_of_birth = 'Date of birth is required.'

  const passwordIssues = []
  if (values.password.length < 8) passwordIssues.push('at least 8 characters')
  if (!/[A-Z]/.test(values.password)) passwordIssues.push('an uppercase letter')
  if (!/[a-z]/.test(values.password)) passwordIssues.push('a lowercase letter')
  if (!/[0-9]/.test(values.password)) passwordIssues.push('a number')
  if (passwordIssues.length > 0) {
    errors.password = `Password must include ${passwordIssues.join(', ')}.`
  }

  return errors
}

export default function RegisterForm() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const passwordChecks = {
    length: values.password.length >= 8,
    upper: /[A-Z]/.test(values.password),
    lower: /[a-z]/.test(values.password),
    number: /[0-9]/.test(values.password),
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setFormError('Please fix the highlighted fields.')
      return
    }

    setLoading(true)
    try {
      // The backend's register payload (docs/api.md) does not include an
      // is_public flag — only email, password, first_name, last_name,
      // date_of_birth, and optional nickname / about_me / avatar.
      await register(values)
      router.push('/login')
    } catch (err) {
      const payload = err?.response?.data
      setErrors(payload?.errors || {})
      setFormError(payload?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Create your account</h2>

      {formError && (
        <div className="mb-4 rounded border border-red-200 bg-red-100 p-3 text-sm text-red-600">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <input
              name="first_name"
              value={values.first_name}
              onChange={handleChange}
              autoComplete="given-name"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <input
              name="last_name"
              value={values.last_name}
              onChange={handleChange}
              autoComplete="family-name"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email address</label>
          <input
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            autoComplete="email"
            placeholder="name@example.com"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of birth</label>
          <input
            type="date"
            name="date_of_birth"
            value={values.date_of_birth}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.date_of_birth && (
            <p className="mt-1 text-xs text-red-600">{errors.date_of_birth}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={values.password}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="••••••••"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}

          <ul className="mt-2 space-y-1 text-xs">
            {[
              ['length', 'At least 8 characters'],
              ['upper', 'One uppercase letter'],
              ['lower', 'One lowercase letter'],
              ['number', 'One number'],
            ].map(([key, label]) => (
              <li key={key} className={passwordChecks[key] ? 'text-green-600' : 'text-gray-400'}>
                {passwordChecks[key] ? '✓' : '–'} {label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Nickname (optional)</label>
          <input
            name="nickname"
            value={values.nickname}
            onChange={handleChange}
            autoComplete="nickname"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">About me (optional)</label>
          <textarea
            name="about_me"
            value={values.about_me}
            onChange={handleChange}
            rows={3}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition duration-200 hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  )
}