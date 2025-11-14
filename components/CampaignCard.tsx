import Link from 'next/link'

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
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-2">{campaign.name}</h3>
        {campaign.description && (
          <p className="text-gray-400 mb-4 line-clamp-2">{campaign.description}</p>
        )}
        <div className="flex space-x-4 text-sm text-gray-500">
          <span>{campaign._count?.sessions || 0} Sessions</span>
          <span>{campaign._count?.characters || 0} Characters</span>
        </div>
      </div>
    </Link>
  )
}

