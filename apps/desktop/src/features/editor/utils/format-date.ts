export function formatNoteDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()

  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffSeconds < 60) return 'Just now'

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (date >= todayStart) {
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    return timeStr
  }

  if (date >= yesterdayStart) return `Yesterday, ${timeStr}`

  const currentYear = now.getFullYear()
  if (date.getFullYear() === currentYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
