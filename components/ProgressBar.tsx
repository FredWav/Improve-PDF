'use client'
import React from 'react'

export function ProgressBar({ value = 0, label }: { value?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="w-full">
      <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${v}%` }}
          role="progressbar"
          aria-valuenow={v}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {label && <div className="mt-1 text-[11px] text-slate-500">{label}</div>}
    </div>
  )
}
