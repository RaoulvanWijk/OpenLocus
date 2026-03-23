import type { AppError } from '@/types/bindings/AppError'

const FRIENDLY_ERROR_MESSAGES: Record<AppError['error_code'], string> = {
  IO: 'We could not access your local files. Check file permissions and try again.',
  DB: 'The local database is currently unavailable. Please retry in a moment.',
  AI: 'The AI service is unavailable right now. Try again shortly.',
  INTERNAL: 'Something unexpected happened. Please try again.',
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function isAppError(value: unknown): value is AppError {
  if (!isRecord(value)) {
    return false
  }

  const errorCode = value.error_code
  const context = value.context
  const technicalDetails = value.technical_details

  return (
    (errorCode === 'IO' || errorCode === 'DB' || errorCode === 'AI' || errorCode === 'INTERNAL') &&
    (context === 'filesystem' ||
      context === 'database' ||
      context === 'ai' ||
      context === 'internal') &&
    (technicalDetails === null || typeof technicalDetails === 'string')
  )
}

function parseJsonErrorMessage(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function extractAppError(error: unknown): AppError | null {
  const parsed = parseJsonErrorMessage(error)

  if (isAppError(parsed)) {
    return parsed
  }

  if (isRecord(parsed) && 'error' in parsed && isAppError(parsed.error)) {
    return parsed.error
  }

  if (isRecord(parsed) && parsed instanceof Error && typeof parsed.message === 'string') {
    const parsedFromMessage = parseJsonErrorMessage(parsed.message)
    if (isAppError(parsedFromMessage)) {
      return parsedFromMessage
    }
  }

  return null
}

export function toUserErrorMessage(error: unknown): {
  title: string
  details: string
  debugDetails?: string
  code: AppError['error_code'] | 'UNKNOWN'
} {
  const appError = extractAppError(error)

  if (!appError) {
    return {
      title: 'Unexpected application error',
      details: 'An unknown error occurred. Please try again.',
      debugDetails: error instanceof Error ? error.message : undefined,
      code: 'UNKNOWN',
    }
  }

  return {
    title: `${appError.error_code} error`,
    details: FRIENDLY_ERROR_MESSAGES[appError.error_code],
    debugDetails: appError.technical_details ?? undefined,
    code: appError.error_code,
  }
}
