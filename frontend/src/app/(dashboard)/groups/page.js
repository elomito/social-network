"use client";

import React, { useState } from 'react'
import GroupCard from '@/components/features/groups/GroupCard'
import useAuth from '@/hooks/useAuth'

const sampleGroups = [
  { 
    id: 1, 
    title: 'Gophers', 
    description: 'Go language enthusiasts',
    member_count: 124,
    privacy: 'public',
    cover_image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'
  },
  { 
    id: 2, 
    title: 'Photographers', 
    description: 'Share your photos',
    member_count: 89,
    privacy: 'public',
    cover_image_url: 'https://images.unsplash.com/photo-1526401240-300d0dce14d3?w=400'
  },
  { 
    id: 3, 
    title: 'Travel Buddies', 
    description: 'Find travel companions',
    member_count: 256,
    privacy: 'private',
    cover_image_url: 'https://images.unsplash.com/photo-1488641423053-0d24d1766249?w=400'
  },
  { 
    id: 4, 
    title: 'Fitness Club', 
    description: 'Workout motivation and tips',
    member_count: 412,
    privacy: 'public',
    cover_image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
  }
]

export default function GroupsPage() {
  const { user } = useAuth() || {}
  const [search, setSearch] = useState('')
  const [filteredGroups] = useState(() => sampleGroups.filter(group => 
    group.title.toLowerCase().includes(search.toLowerCase()) ||
    group.description.toLowerCase().includes(search.toLowerCase())
  ))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Groups</h1>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
          >
          </input>
          <button
            onClick={() => {
              // Navigate to create group page
              // For now, just alert
              alert('Create group functionality would go here')
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Group
          </button>
        </div>
      </div>
      
      {filteredGroups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No groups found matching your search.</p>
        </div>
      )}
    </div>
  )
}
