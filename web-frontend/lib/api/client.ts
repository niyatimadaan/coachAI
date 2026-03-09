import { NetworkError, TimeoutError, APIError, UnknownError } from './errors'

interface RequestConfig extends RequestInit {
  timeout?: number
}

export class APIClient {
  private baseURL: string
  private defaultTimeout: number

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '', timeout: number = 30000) {
    this.baseURL = baseURL
    this.defaultTimeout = timeout
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { timeout = this.defaultTimeout, ...fetchConfig } = config
    const url = `${this.baseURL}${endpoint}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
        credentials: 'include', // Include cookies in cross-origin requests
        headers: {
          'Content-Type': 'application/json',
          ...fetchConfig.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new APIError(response.status, response.statusText, errorData)
      }

      return await response.json()
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${timeout}ms`)
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Unable to connect to server')
      }

      throw new UnknownError('An unexpected error occurred', error)
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

// Singleton instance
export const apiClient = new APIClient()
