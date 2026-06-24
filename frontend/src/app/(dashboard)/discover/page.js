"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function DiscoverPage() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const observer = useRef();
// 1. Debounce Logic: Updates debouncedQuery 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset back to page 1 whenever searching something new
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);
// 2. Infinite Scroll: Triggers loading the next batch when reaching the bottom
  const lastUserElementRef = useCallback((node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prevPage) => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);
// 3. Core API Fetching
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
// Targets your Go api server directory configuration
        const url = `http://localhost:8080/api/users/discover?search=${encodeURIComponent(debouncedQuery)}&page=${page}&limit=12`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Could not fetch user discovery directory.');

        const data = await response.json();
        const incomingUsers = data.users || [];

        setUsers((prevUsers) => {
          return page === 1 ? incomingUsers : [...prevUsers, ...incomingUsers];
        });
        
        setHasMore(incomingUsers.length === 12);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedQuery, page]);
// 4. Follow/Unfollow Handler Action
  const handleFollowToggle = async (userId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: true }));
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const endpoint = currentStatus ? `/api/unfollow/${userId}` : `/api/follow/${userId}`;
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Action execution failed.');
