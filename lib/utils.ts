import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a timestamp value into a Date object, handling null/undefined/invalid values
 */
export function parseTimestamp(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formats a timestamp for conversation display with proper time units
 * - < 1 hour: show minutes (e.g., "45m ago")
 * - 1-24 hours: show "hours, minutes" (e.g., "2h 15m ago")
 * - > 24 hours: show "days hours minutes" (e.g., "3d 2h 15m ago")
 * - > 30 days: show ">30d"
 * Returns null if timestamp is invalid/missing
 */
export function formatConversationTime(date: Date | string | null | undefined): string | null {
  const dateObj = parseTimestamp(date)
  if (!dateObj || dateObj.getTime() === 0) {
    return null // Invalid/missing timestamp
  }

  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()

  // Convert to different time units
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // > 30 days
  if (days > 30) {
    return '>30d'
  }

  // > 24 hours: show "days hours minutes"
  if (hours >= 24) {
    const remainingHours = hours % 24
    const remainingMinutes = minutes % 60
    return `${days}d ${remainingHours}h ${remainingMinutes}m ago`
  }

  // 1-24 hours: show "hours, minutes"
  if (hours >= 1) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m ago`
  }

  // < 1 hour: show minutes
  if (minutes >= 1) {
    return `${minutes}m ago`
  }

  // Just now for very recent
  return 'Just now'
}
