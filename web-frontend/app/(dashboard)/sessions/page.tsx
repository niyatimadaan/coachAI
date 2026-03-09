import { Metadata } from 'next'
import SessionManager from '@/components/dashboard/SessionManager'

export const metadata: Metadata = {
  title: 'Sessions | CoachAI',
  description: 'View and manage training sessions',
}

export default function SessionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Training Sessions</h1>
      <SessionManager />
    </div>
  )
}
