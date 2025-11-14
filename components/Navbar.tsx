import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-white">
            AI RPG Manager
          </Link>
          <div className="flex space-x-6">
            <Link href="/campaigns" className="text-gray-300 hover:text-white transition-colors">
              Campaigns
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

