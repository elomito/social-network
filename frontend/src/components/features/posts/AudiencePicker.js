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
