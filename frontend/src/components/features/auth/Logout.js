'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Logout() {
  const { logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await logout()
    } finally {
      router.push('/login')
    }
  }

  return (
    <button
      className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-red-300"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  )
}