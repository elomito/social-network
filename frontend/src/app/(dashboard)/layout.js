'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/context/ProtectedRoute'
import Sidebar from '@/components/layout/Sidebar'
import RightSidebar from '@/components/layout/RightSidebar'
import Navbar from '@/components/layout/Navbar'

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
      <div className="flex min-h-screen flex-col bg-gray-50/50">
        <Navbar />
        <div className="app-grid container flex-1">
          <aside className="sidebar">
            <Sidebar />
          </aside>
          <main className="min-w-0">
            {children}
          </main>
          <aside className="right-sidebar">
            <RightSidebar />
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  )
}
