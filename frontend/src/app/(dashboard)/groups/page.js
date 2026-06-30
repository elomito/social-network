'use client'

import React, { useState, useEffect } from 'react'
import GroupCard from '@/components/features/groups/GroupCard'

export default function GroupsPage() {
  const [search, setSearch] = useState('')
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8080/api/groups?search=${encodeURIComponent(search)}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      setGroups(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [search])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!title) return
    setCreating(true)
    setError('')
    try {
      const response = await fetch('http://localhost:8080/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title, description }),
      })
      if (!response.ok) {
        throw new Error('Failed to create group. Please try again.')
      }
      setTitle('')
      setDescription('')
      setCreateOpen(false)
      fetchGroups()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">Join hubs and exchange discussions around shared interests.</p>
        </div>
        <div className="mt-4 flex items-center gap-3 md:mt-0">
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-64"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Create Group
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse rounded-lg border border-gray-100 bg-white p-4 shadow"
            >
              <div className="mb-3 h-32 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : groups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center rounded-lg border border-dashed border-gray-300 bg-white">
          <p className="text-gray-500">No groups found matching your search.</p>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Group</h2>
            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 p-2.5 rounded border border-red-100">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. JavaScript Developers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Describe the group purpose..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false)
                    setError('')
                  }}
                  className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
