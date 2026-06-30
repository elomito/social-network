import React from 'react'

export default function Avatar({ src, alt, size = 'md', fallback, className = '' }) {
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  }

  const sizeClass = sizeClasses[size] || sizeClasses.md

  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 font-bold text-white ${sizeClass} ${className}`}
    >
      {fallback || '?'}
    </div>
  )
}
