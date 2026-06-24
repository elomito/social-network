"use client"

import React, { useEffect, useState } from 'react'
import { getGroups } from '../../../lib/apiClient'
import Link from 'next/link'

export default function GroupsDiscoverPage() {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const res = await getGroups()
        setGroups(res.data || res)
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Groups</h2>
      <div className="grid grid-cols-3 gap-4">
        {groups.map(g => (
          <Link key={g.id} href={`/groups/${g.id}`} className="bg-white p-4 rounded shadow hover:shadow-md">
            <div className="text-md font-medium">{g.title}</div>
            <div className="text-xs text-gray-500">{g.member_count || 0} members</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
