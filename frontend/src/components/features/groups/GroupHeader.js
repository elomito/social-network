import React from 'react'

export default function GroupHeader({ group, isMember, onJoinToggle, onInvite }) {
  const privacyLabel = group && group.privacy === 'private' ? 'Private' : 'Public'

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow">
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-100">
          {group && group.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={group.cover_image_url} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{group ? group.title : 'Group'}</h1>
          <p className="mt-1 text-sm text-gray-500">{group ? group.description : ''}</p>

          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
              {privacyLabel}
            </span>
            <span className="text-sm text-gray-600">
              {group ? `${group.member_count} members` : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!isMember ? (
            <button
              onClick={onJoinToggle}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Join
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={onJoinToggle}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              >
                Joined
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onInvite}
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                >
                  Invite
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
