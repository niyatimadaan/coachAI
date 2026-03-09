import { Suspense } from 'react'
import { StudentDetailView } from './StudentDetailView'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<StudentDetailSkeleton />}>
        <StudentDetailView studentId={id} />
      </Suspense>
    </div>
  )
}

function StudentDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}
