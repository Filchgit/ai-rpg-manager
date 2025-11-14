import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4">AI RPG Manager</h1>
          <p className="text-xl text-gray-300 mb-8">
            Your AI-powered Dungeon Master for epic tabletop adventures
          </p>
          <Link
            href="/campaigns"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
            <h3 className="text-2xl font-semibold mb-3">Campaign Management</h3>
            <p className="text-gray-300">
              Create and manage multiple campaigns with custom world settings and AI guidelines.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
            <h3 className="text-2xl font-semibold mb-3">AI Dungeon Master</h3>
            <p className="text-gray-300">
              Let AI help tell your story, responding dynamically to player actions and decisions.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
            <h3 className="text-2xl font-semibold mb-3">Character Tracking</h3>
            <p className="text-gray-300">
              Manage characters with stats, backstories, and seamless integration into sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
