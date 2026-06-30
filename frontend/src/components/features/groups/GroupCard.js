'use client'

import React from 'react'
import Link from 'next/link'

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
    <Link href={`/groups/${id}`} className="block">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        {cover_image_url ? (
          <img
            src={cover_image_url}
            alt={title}
            className="h-32 w-full rounded-t-lg object-cover"
          />
        ) : (
          <div className="h-32 w-full rounded-t-lg bg-gradient-to-tr from-blue-500 to-indigo-600" />
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{description}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{member_count} members</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 capitalize">{privacy}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
