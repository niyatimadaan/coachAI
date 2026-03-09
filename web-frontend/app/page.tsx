import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          CoachAI Web Dashboard
        </h1>
        <p className="text-center mb-8">
          Welcome to the CoachAI coaching platform
        </p>
        <div className="flex justify-center">
          <Link
            href="/login"
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
