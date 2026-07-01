import React from 'react'

export default function Input({
  label,
  error,
  id,
  type = 'text',
  className = '',
  containerClassName = '',
  ...props
}) {
  const inputId = id || props.name

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        aria-invalid={Boolean(error)}
        className={`w-full rounded border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}