"use client";

import React, { useState, useEffect } from 'react';

export default function AudiencePicker({ privacy, onAudienceChange, onError }) {
  const [followers, setFollowers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
// 1. Fetch current followers matching your Go backend relationship endpoints
  useEffect(() => {
    if (privacy !== 'private') return;

    const fetchFollowers = async () => {
      try {
        setLoading(true);
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
const response = await fetch('http://localhost:8080/api/followers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to load followers list.');

        const data = await response.json();
        setFollowers(data.followers || []);
      } catch (err) {
        if (onError) onError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [privacy]);
// 2. Bubble selection arrays back up to the main Composer state context
  useEffect(() => {
    if (privacy === 'private') {
      onAudienceChange(selectedFollowers.map(f => f.id));
      if (selectedFollowers.length === 0) {
        if (onError) onError('Private posts require at least one selected follower.');
      } else {
        if (onError) onError('');
      }
    } else {
      onAudienceChange([]); // Clear if toggled away
      if (onError) onError('');
    }
  }, [selectedFollowers, privacy]);
// Only display component if privacy state is explicitly marked 'private'
  if (privacy !== 'private') return null;

  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedFollowers.some(selected => selected.id === follower.id)
  );

  const handleSelect = (follower) => {
    setSelectedFollowers([...selectedFollowers, follower]);
    setSearchQuery('');
  };

  const handleRemove = (followerId) => {
    setSelectedFollowers(selectedFollowers.filter(f => f.id !== followerId));
  };
