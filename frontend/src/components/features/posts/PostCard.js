import React from 'react';

export default function PostCard({ post }) {
  // Gracefully handle missing data fields just in case
  const {
    authorName = 'Anonymous User',
    authorAvatar,
    createdAt,
    content = '',
    imageUrl,
    privacy = 'public',
    likesCount = 0,
    commentsCount = 0
  } = post;
