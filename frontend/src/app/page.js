import React from 'react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-gray-900">SocialNetwork</span>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Stay close to the people who matter.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Share updates, join groups built around what you care about, and keep the
              conversation going — in your feed, your messages, and your events.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/register"
                className="rounded bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className="rounded border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Log in
              </Link>
              <Link
                href="/feed"
                className="rounded border border-indigo-600 bg-indigo-50 px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                Continue to app
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['Feed', 'See posts from people and groups you follow.'],
              ['Groups', 'Organize events and discussions around shared interests.'],
              ['Messages', 'Talk directly, one to one or in a group chat.'],
              ['Notifications', 'Know the moment something needs your attention.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-xs text-gray-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} SocialNetwork. All rights reserved.</p>
      </footer>
    </div>
  )
}