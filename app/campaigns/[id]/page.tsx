'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CreateSessionModal from '@/components/CreateSessionModal'
import CreateCharacterModal from '@/components/CreateCharacterModal'

type Campaign = {
  id: string
  name: string
  description: string | null
  worldSettings: string | null
  aiGuidelines: string | null
  sessions: Array<{
    id: string
    name: string
    status: string
    startedAt: string
  }>
  characters: Array<{
    id: string
    name: string
    race: string | null
    class: string | null
    level: number
  }>
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${id}`)
      const data = await response.json()
      setCampaign(data)
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          Loading campaign...
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          Campaign not found
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/campaigns" className="text-purple-400 hover:text-purple-300">
            ← Back to Campaigns
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{campaign.name}</h1>
          {campaign.description && <p className="text-gray-300 mb-4">{campaign.description}</p>}
          {campaign.worldSettings && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-1">World Settings</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{campaign.worldSettings}</p>
            </div>
          )}
          {campaign.aiGuidelines && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">AI Guidelines</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{campaign.aiGuidelines}</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Sessions</h2>
              <button
                onClick={() => setShowSessionModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                New Session
              </button>
            </div>
            {campaign.sessions.length === 0 ? (
              <p className="text-gray-400">No sessions yet</p>
            ) : (
              <div className="space-y-3">
                {campaign.sessions.map(session => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer">
                      <h3 className="text-lg font-semibold text-white">{session.name}</h3>
                      <p className="text-sm text-gray-400">Status: {session.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Characters</h2>
              <button
                onClick={() => setShowCharacterModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                New Character
              </button>
            </div>
            {campaign.characters.length === 0 ? (
              <p className="text-gray-400">No characters yet</p>
            ) : (
              <div className="space-y-3">
                {campaign.characters.map(character => (
                  <div key={character.id} className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white">{character.name}</h3>
                    <p className="text-sm text-gray-400">
                      {character.race && `${character.race} `}
                      {character.class && `${character.class} `}
                      Level {character.level}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSessionModal && (
        <CreateSessionModal
          campaignId={campaign.id}
          onClose={() => setShowSessionModal(false)}
          onSuccess={() => {
            setShowSessionModal(false)
            fetchCampaign()
          }}
        />
      )}

      {showCharacterModal && (
        <CreateCharacterModal
          campaignId={campaign.id}
          onClose={() => setShowCharacterModal(false)}
          onSuccess={() => {
            setShowCharacterModal(false)
            fetchCampaign()
          }}
        />
      )}
    </div>
  )
}

