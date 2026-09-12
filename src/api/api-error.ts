export class ApiError extends Error {
  readonly status: number
  readonly requestId?: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    requestId?: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
    this.details = details
  }
}

type ErrorPayload = {
  message?: string | string[]
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback

  const message = (payload as ErrorPayload).message
  if (Array.isArray(message)) return message.join(', ')
  return typeof message === 'string' ? message : fallback
}
