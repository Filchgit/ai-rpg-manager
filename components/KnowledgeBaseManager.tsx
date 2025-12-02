'use client'

import { useEffect, useState } from 'react'

type KnowledgeCategory =
  | 'LOCATION'
  | 'NPC'
  | 'ITEM'
  | 'LORE'
  | 'FACTION'
  | 'QUEST'
  | 'OTHER'

interface KnowledgeEntry {
  id: string
  category: KnowledgeCategory
  title: string
  content: string
  keywords: string[]
  usageCount: number
}

interface KnowledgeBaseManagerProps {
  campaignId: string
}

export default function KnowledgeBaseManager({
  campaignId,
}: KnowledgeBaseManagerProps) {
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [filterCategory, setFilterCategory] = useState<KnowledgeCategory | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    category: 'LOCATION' as KnowledgeCategory,
    title: '',
    content: '',
    keywords: '',
  })

  const categories: KnowledgeCategory[] = [
    'LOCATION',
    'NPC',
    'ITEM',
    'LORE',
    'FACTION',
    'QUEST',
    'OTHER',
  ]

  const fetchKnowledge = async () => {
    try {
      const params = new URLSearchParams()
      if (filterCategory !== 'ALL') {
        params.set('category', filterCategory)
      }
      if (searchQuery) {
        params.set('query', searchQuery)
      }

      const response = await fetch(
        `/api/campaigns/${campaignId}/knowledge?${params}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge')
      }
      const data = await response.json()
      setKnowledge(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKnowledge()
  }, [campaignId, filterCategory, searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      if (editingEntry) {
        // Update existing
        const response = await fetch(
          `/api/campaigns/${campaignId}/knowledge/${editingEntry.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: formData.category,
              title: formData.title,
              content: formData.content,
              keywords: keywordsArray,
            }),
          }
        )
        if (!response.ok) throw new Error('Failed to update knowledge')
      } else {
        // Create new
        const response = await fetch(`/api/campaigns/${campaignId}/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formData.category,
            title: formData.title,
            content: formData.content,
            keywords: keywordsArray,
          }),
        })
        if (!response.ok) throw new Error('Failed to create knowledge')
      }

      setFormData({ category: 'LOCATION', title: '', content: '', keywords: '' })
      setShowAddForm(false)
      setEditingEntry(null)
      fetchKnowledge()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setFormData({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords.join(', '),
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/knowledge/${id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete')
      fetchKnowledge()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingEntry(null)
    setFormData({ category: 'LOCATION', title: '', content: '', keywords: '' })
  }

  if (loading) {
    return <p className="text-gray-600 dark:text-gray-400">Loading knowledge base...</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Campaign Knowledge Base
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingEntry ? 'Edit Entry' : 'Add New Entry'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as KnowledgeCategory })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={6}
                required
                maxLength={5000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="tavern, innkeeper, rumors"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingEntry ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as KnowledgeCategory | 'ALL')}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Knowledge List */}
      <div className="space-y-3">
        {knowledge.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No knowledge entries found. Add your first entry to get started!
          </p>
        ) : (
          knowledge.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {entry.category}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {entry.title}
                    </h3>
                    {entry.usageCount > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (used {entry.usageCount}x)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  {entry.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-600 dark:text-red-400 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}




