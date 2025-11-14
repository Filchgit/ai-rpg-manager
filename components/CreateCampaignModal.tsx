'use client'

import { useState } from 'react'

type CreateCampaignModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [worldSettings, setWorldSettings] = useState('')
  const [aiGuidelines, setAiGuidelines] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, worldSettings, aiGuidelines }),
      })

      if (!response.ok) {
        throw new Error('Failed to create campaign')
      }

      onSuccess()
    } catch (err) {
      setError('Failed to create campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Create New Campaign</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter campaign name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Brief description of the campaign"
            />
          </div>

          <div>
            <label
              htmlFor="worldSettings"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              World Settings
            </label>
            <textarea
              id="worldSettings"
              value={worldSettings}
              onChange={e => setWorldSettings(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe the world, setting, time period, etc."
            />
          </div>

          <div>
            <label htmlFor="aiGuidelines" className="block text-sm font-medium text-gray-300 mb-1">
              AI Guidelines
            </label>
            <textarea
              id="aiGuidelines"
              value={aiGuidelines}
              onChange={e => setAiGuidelines(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Guidelines for how the AI should narrate (tone, style, themes, etc.)"
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
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

