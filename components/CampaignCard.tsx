'use client'

import Link from 'next/link'
import { useState } from 'react'

type CampaignCardProps = {
  campaign: {
    id: string
    name: string
    description: string | null
    createdAt: string
    _count?: {
      sessions: number
      characters: number
    }
  }
  onDelete?: (campaignId: string) => void
}

export default function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete campaign')
      }

      setShowConfirmDialog(false)
      onDelete?.(campaign.id)
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('Failed to delete campaign. Please try again.')
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirmDialog(false)
  }

  return (
    <>
      <Link href={`/campaigns/${campaign.id}`}>
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700 relative">
          <button
            onClick={handleDeleteClick}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-gray-700 rounded"
            title="Delete campaign"
            disabled={isDeleting}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </button>
          
          <h3 className="text-2xl font-bold text-white mb-2 pr-8">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-gray-400 mb-4 line-clamp-2">{campaign.description}</p>
          )}
          <div className="flex space-x-4 text-sm text-gray-500">
            <span>{campaign._count?.sessions || 0} Sessions</span>
            <span>{campaign._count?.characters || 0} Characters</span>
          </div>
        </div>
      </Link>

      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelDelete}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Delete Campaign?</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to permanently delete <strong>{campaign.name}</strong>?
            </p>
            <p className="text-gray-400 text-sm mb-4">
              This will also delete:
            </p>
            <ul className="text-gray-400 text-sm mb-6 list-disc list-inside">
              <li>{campaign._count?.sessions || 0} session(s) and all messages</li>
              <li>{campaign._count?.characters || 0} character(s)</li>
              <li>All campaign knowledge, tone profiles, and mechanics rules</li>
            </ul>
            <p className="text-red-400 text-sm mb-6 font-semibold">
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

