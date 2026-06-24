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
