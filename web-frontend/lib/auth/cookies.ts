import { cookies } from 'next/headers'

const TOKEN_COOKIE_NAME = 'auth_token'

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  })
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value
}

export async function deleteAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_COOKIE_NAME)
}
