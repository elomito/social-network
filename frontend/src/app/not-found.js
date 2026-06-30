'use client'

import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page not found</p>
        <p className="mt-2 text-gray-500">Sorry, we couldn't find the page you're looking for.</p>
        <Link
          href="/feed"
          className="mt-6 inline-block rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Go to Feed
        </Link>
      </div>
    </div>
  )
}