import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

const Logout = () => {
  const { setToken } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    setToken(null)
    router.push('/auth/login')
  }

  return (
    <button className="rounded bg-red-600 px-4 py-2 text-white" onClick={handleLogout}>
      Logout
    </button>
  )
}
export default Logout
