import React from 'react'
import ProtectedRoute from '@/context/ProtectedRoute'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }) {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="app-grid container">
        <aside className="sidebar">
          <Sidebar />
        </aside>
        <main>{children}</main>
        <div>{/* right column: placeholders for trends/ads */}</div>
      </div>
    </ProtectedRoute>
  )
}
