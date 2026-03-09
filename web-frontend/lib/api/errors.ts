export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class APIError extends Error {
  status: number
  statusText: string
  data?: any

  constructor(status: number, statusText: string, data?: any) {
    super(`API Error: ${status} ${statusText}`)
    this.name = 'APIError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

export class UnknownError extends Error {
  originalError?: any

  constructor(message: string, originalError?: any) {
    super(message)
    this.name = 'UnknownError'
    this.originalError = originalError
  }
}
