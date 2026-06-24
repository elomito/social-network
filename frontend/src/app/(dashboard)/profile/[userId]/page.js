'use client'

import { useEffect, useState } from 'react'

export default function Page({ params }) {
  const userId = params?.userId
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    if (!userId) return
    let mounted = true
    setState({ status: 'loading', data: null, error: null })

    fetch(`/api/users?id=${userId}`, { credentials: 'include' })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || ''
        const payload = contentType.includes('application/json') ? await res.json() : { message: await res.text() }
        if (!res.ok) throw { status: res.status, payload }
        return payload
      })
      .then((data) => {
        if (mounted) setState({ status: 'ready', data, error: null })
      })
      .catch((err) => {
        if (mounted) setState({ status: 'error', data: null, error: err })
      })

    return () => {
      mounted = false
    }
  }, [userId])

  if (state.status === 'loading') return <div className="p-4">Loading profile...</div>
  if (state.status === 'error') {
    const msg = state.error?.payload?.message || state.error?.message || 'Unknown error'
    return <div className="p-4 text-red-600">Error loading profile: {msg}</div>
  }

  const u = state.data
  if (!u) return <div className="p-4">No profile data available.</div>

  // locked view for private profiles to non-followers
  if (u.locked) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-xl text-gray-700">{u.first_name?.[0] || 'U'}</div>
          <div>
            <h1 className="text-2xl font-semibold">{u.first_name} {u.last_name}</h1>
            <div className="text-sm text-gray-500">🔒 Private profile</div>
          </div>
        </div>
        <div className="mt-4 text-gray-500">This profile is private. Follow to request access.</div>
      </div>
    )
  }

  // owner-only visibility toggle
  const [toggling, setToggling] = useState(false)
  const [isPublic, setIsPublic] = useState(Boolean(u.is_public))

  const onToggle = async () => {
    if (!u.is_owner || toggling) return
    const prev = isPublic
    const next = !prev
    setIsPublic(next)
    setToggling(true)
    try {
      const res = await fetch('/api/users/visibility', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: next }),
      })
      if (!res.ok) throw new Error('Failed to update visibility')
      setToggling(false)
    } catch (err) {
      setIsPublic(prev)
      setToggling(false)
      alert('Failed to update visibility')
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-xl text-gray-700">{u.first_name?.[0] || 'U'}</div>
          <div>
            <h1 className="text-2xl font-semibold">{u.first_name} {u.last_name}</h1>
            {u.nickname && <div className="text-sm text-gray-500">@{u.nickname}</div>}
          </div>
        </div>

        {u.is_owner && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Public</label>
            <button onClick={onToggle} disabled={toggling} className="p-2 bg-gray-100 rounded">
              {isPublic ? '🔓' : '🔒'}
            </button>
          </div>
        )}
      </div>

      {u.about_me ? (
        <div className="mt-4 text-gray-800">{u.about_me}</div>
      ) : (
        <div className="mt-4 text-gray-500 italic">No bio provided.</div>
      )}
    </div>
  )
}
