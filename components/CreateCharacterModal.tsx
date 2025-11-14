'use client'

import { useState } from 'react'

type CreateCharacterModalProps = {
  campaignId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreateCharacterModal({
  campaignId,
  onClose,
  onSuccess,
}: CreateCharacterModalProps) {
  const [name, setName] = useState('')
  const [race, setRace] = useState('')
  const [charClass, setCharClass] = useState('')
  const [level, setLevel] = useState(1)
  const [backstory, setBackstory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          name,
          race: race || undefined,
          class: charClass || undefined,
          level,
          backstory: backstory || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create character')
      }

      onSuccess()
    } catch (err) {
      setError('Failed to create character. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Create New Character</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="charName" className="block text-sm font-medium text-gray-300 mb-1">
              Character Name *
            </label>
            <input
              type="text"
              id="charName"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter character name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="race" className="block text-sm font-medium text-gray-300 mb-1">
                Race
              </label>
              <input
                type="text"
                id="race"
                value={race}
                onChange={e => setRace(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Human"
              />
            </div>

            <div>
              <label htmlFor="class" className="block text-sm font-medium text-gray-300 mb-1">
                Class
              </label>
              <input
                type="text"
                id="class"
                value={charClass}
                onChange={e => setCharClass(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Fighter"
              />
            </div>
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-300 mb-1">
              Level
            </label>
            <input
              type="number"
              id="level"
              value={level}
              onChange={e => setLevel(parseInt(e.target.value) || 1)}
              min={1}
              max={20}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label htmlFor="backstory" className="block text-sm font-medium text-gray-300 mb-1">
              Backstory
            </label>
            <textarea
              id="backstory"
              value={backstory}
              onChange={e => setBackstory(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Character's background story"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

