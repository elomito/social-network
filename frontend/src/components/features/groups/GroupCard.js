'use client'

import React from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'

export default function GroupCard({ group }) {
  const {
    id,
    title = 'Untitled Group',
    description = 'No description available',
    member_count = 0,
    privacy = 'public',
    cover_image_url,
  } = group

  return (
    <Link href={`/groups/${id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
        {cover_image_url ? (
          <img
            src={cover_image_url}
            alt={title}
            className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
            <svg className="h-12 w-12 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        )}
        <div className="p-4">
          <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-gray-500">{description}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <span>{member_count} members</span>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              privacy === 'public'
                ? 'bg-green-100 text-green-700'
                : privacy === 'private'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {privacy}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
