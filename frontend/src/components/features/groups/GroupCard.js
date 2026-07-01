import React from 'react'
import Link from 'next/link'

export default function GroupCard({ group }) {
  const {
    id,
    title = 'Untitled group',
    description = '',
    member_count = 0,
    privacy = 'public',
    cover_image_url,
  } = group || {}

  return (
    <Link
      href={`/groups/${id}`}
      className="block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="h-32 w-full bg-gray-100">
        {cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover_image_url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-base font-semibold text-gray-900">{title}</h3>
          <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
            {privacy}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{description}</p>

        <p className="mt-3 text-xs font-medium text-gray-400">
          {member_count} {member_count === 1 ? 'member' : 'members'}
        </p>
      </div>
    </Link>
  )
}