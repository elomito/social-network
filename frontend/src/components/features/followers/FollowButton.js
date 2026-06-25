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
