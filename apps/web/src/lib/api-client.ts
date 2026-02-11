import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
})

// Retry interceptor for network errors and 5xx responses
const MAX_RETRIES = 2
const RETRY_DELAY_BASE = 1000

function isRetryableStatus(status: number | undefined): boolean {
  return status !== undefined && (status >= 500 || status === 429)
}

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config
  if (!config) return Promise.reject(error)

  const retryCount = ((config as unknown as Record<string, unknown>).__retryCount as number) ?? 0

  const isNetworkError = !error.response && error.code !== 'ECONNABORTED'
  const isRetryable = isNetworkError || isRetryableStatus(error.response?.status)

  if (isRetryable && retryCount < MAX_RETRIES) {
    ;(config as unknown as Record<string, unknown>).__retryCount = retryCount + 1
    const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return apiClient(config)
  }

  return Promise.reject(error)
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      const updatedConfig = { ...config }
      updatedConfig.headers = config.headers ?? {}
      updatedConfig.headers.set('Authorization', `Bearer ${accessToken}`)
      return updatedConfig
    }
    return config
  },
)

interface RefreshTokenResponse {
  readonly accessToken: string
}

let isRefreshing = false
let failedQueue: Array<{
  readonly resolve: (value: unknown) => void
  readonly reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  const queue = [...failedQueue]
  failedQueue = []
  for (const promise of queue) {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token)
    }
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config
    if (!originalRequest) {
      return Promise.reject(error)
    }

    const isUnauthorized = error.response?.status === 401
    const isAuthRequest = originalRequest.url?.includes('/auth/')

    if (isUnauthorized && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue = [...failedQueue, { resolve, reject }]
        }).then((token) => {
          originalRequest.headers.set('Authorization', `Bearer ${token}`)
          return apiClient(originalRequest)
        })
      }

      isRefreshing = true

      try {
        const { data } = await apiClient.post<RefreshTokenResponse>(
          '/auth/refresh',
        )
        const { setAuth } = useAuthStore.getState()
        const { memberId, memberName, role } = useAuthStore.getState()
        if (memberId && memberName && role) {
          setAuth({
            accessToken: data.accessToken,
            memberId,
            memberName,
            role,
          })
        }
        processQueue(null, data.accessToken)
        originalRequest.headers.set(
          'Authorization',
          `Bearer ${data.accessToken}`,
        )
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

interface ApiResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly meta?: {
    readonly total: number
    readonly page: number
    readonly limit: number
  }
}

export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  const response = await apiClient.get<ApiResponse<T>>(url)
  return response.data
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(url, body)
  return response.data
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await apiClient.put<ApiResponse<T>>(url, body)
  return response.data
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const response = await apiClient.delete<ApiResponse<T>>(url)
  return response.data
}
