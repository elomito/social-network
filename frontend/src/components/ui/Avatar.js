import React from 'react'

const SIZE_CLASSES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

function initialsFromName(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function Avatar({ src, name, size = 'md', className = '', ...props }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        className={`${sizeClass} flex-shrink-0 rounded-full object-cover ${className}`}
        {...props}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 font-bold uppercase text-white ${className}`}
      aria-label={name || 'User avatar'}
      {...props}
    >
      {initialsFromName(name)}
    </div>
  )
}