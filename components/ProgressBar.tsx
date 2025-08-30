'use client'
import React from 'react'

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-slate-200 rounded overflow-hidden" aria-label="Avancement">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}