import React from 'react'

export default function GroupHeader({ group, isMember, onJoinToggle, onInvite }) {
  const privacyLabel = group && group.privacy === 'private' ? 'Private' : 'Public'

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0">
          {group && group.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={group.cover_image_url} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{group ? group.title : 'Group'}</h1>
          <p className="text-sm text-gray-500 mt-1">{group ? group.description : ''}</p>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{privacyLabel}</span>
            <span className="text-sm text-gray-600">{group ? `${group.member_count} members` : ''}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!isMember ? (
            <button
              onClick={onJoinToggle}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Join
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={onJoinToggle}
                className="px-4 py-2 rounded border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                Joined
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onInvite}
                  className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
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
