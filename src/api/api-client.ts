import { ApiError, getApiErrorMessage } from './api-error'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5146/api').replace(
  /\/$/,
  '',
)

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown>
}

type AccessTokenProvider = () => Promise<string | null>

let accessTokenProvider: AccessTokenProvider | null = null

export function setAccessTokenProvider(provider: AccessTokenProvider | null) {
  accessTokenProvider = provider
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const accessToken = await accessTokenProvider?.()

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let body = options.body
  if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    body: body as BodyInit | null | undefined,
  })

  if (!response.ok) {
    const payload = await parseBody(response)
    throw new ApiError(
      getApiErrorMessage(payload, 'לא הצלחנו להשלים את הבקשה.'),
      response.status,
      response.headers.get('x-request-id') ?? undefined,
      payload,
    )
  }

  if (response.status === 204) return undefined as T
  return (await parseBody(response)) as T
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) return response.json()
  return response.text()
}
