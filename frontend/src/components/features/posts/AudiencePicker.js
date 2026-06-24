"use client";

import React, { useState, useEffect } from 'react';

export default function AudiencePicker({ privacy, onAudienceChange, onError }) {
  const [followers, setFollowers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
