'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Determine if current path is active
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/')
  }

  // Different navigation for coaches and students
  const coachNav = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/students', label: 'Students' },
    { href: '/sessions', label: 'Sessions' },
    { href: '/reports', label: 'Reports' },
  ]

  const studentNav = [
    { href: '/dashboard', label: 'My Dashboard' },
    { href: '/my-sessions', label: 'My Sessions' },
    { href: '/my-progress', label: 'My Progress' },
    { href: '/upload-video', label: 'Upload Video' },
  ]

  const navigation = user?.role === 'student' ? studentNav : coachNav
  const dashboardTitle = user?.role === 'student' ? 'Student Portal' : 'Coach Dashboard'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CoachAI {dashboardTitle}</h1>
              {user?.role === 'student' && (
                <p className="text-sm text-gray-600 mt-1">Track your basketball shooting progress</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="block text-sm font-medium text-gray-900">
                  {user?.name || user?.email}
                </span>
                <span className="text-xs text-gray-500 capitalize">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
