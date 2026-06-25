"use client";

import React, { useState } from 'react';

export default function FollowButton({ targetUser, currentUserId, onStateChange }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
// Safety Gate: Don't show a follow button on the user's own profile card
  if (targetUser.id === currentUserId) return null;

  const handleAction = async (bypassConfirm = false) => {
    // Trigger confirmation modal if trying to unfollow
    if (targetUser.isFollowing && !bypassConfirm) {
      setShowConfirm(true);
      return;
    }

    setShowConfirm(false);
    setLoading(true);
// Save initial state for a clean rollback if the backend throws an error
    const previousState = { ...targetUser };

    // 1. OPTIMISTIC UPDATE CALCULATION
    let updatedState = { ...targetUser };
    let endpoint = '';

    if (targetUser.isFollowing) {
      endpoint = `/api/unfollow/${targetUser.id}`;
      updatedState.isFollowing = false;
      if (updatedState.followersCount !== undefined) updatedState.followersCount -= 1;
    } else if (targetUser.isRequested) {
      endpoint = `/api/follow-requests/cancel/${targetUser.id}`;
      updatedState.isRequested = false;
    } else {
      if (targetUser.isPrivate) {
        endpoint = `/api/follow/${targetUser.id}`;
        updatedState.isRequested = true;
      } else {
        endpoint = `/api/follow/${targetUser.id}`;
        updatedState.isFollowing = true;
        if (updatedState.followersCount !== undefined) updatedState.followersCount += 1;
      }
    }
// Force UI to update instantly before network completes
    onStateChange(updatedState);
// 2. DISPATCH NETWORK CALL TO GO BACKEND
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('API request failed');
    } catch (err) {
      console.error('Rolling back relationship state adjustment:', err.message);
