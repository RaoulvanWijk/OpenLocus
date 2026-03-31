export function formatNoteDate(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return 'Invalid date'

  const now = new Date()

  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 60) return 'Just now'

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  if (date >= todayStart) {
    return `Today, ${timeStr}`
  }

  if (date >= yesterdayStart) return `Yesterday, ${timeStr}`

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
