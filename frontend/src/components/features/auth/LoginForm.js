"use client";

import React, { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
const validateForm = () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };
const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;
    setLoading(true);

    try {
      // API Integration matching your Go backend setup
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }
// Store token on success & redirect
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Strict`;
      window.location.href = '/feed'; // Team's dashboard route

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
