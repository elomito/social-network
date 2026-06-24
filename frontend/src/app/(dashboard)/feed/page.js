"use client";

import React, { useState, useEffect } from 'react';
import PostCard from '@/components/features/posts/PostCard';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
