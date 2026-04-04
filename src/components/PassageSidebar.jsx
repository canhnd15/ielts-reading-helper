import { useState, useMemo } from 'react'
import { getDueCount } from '../utils/sm2'

function groupPassages(passages, topics, search) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? passages.filter(p =>
        p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)
      )
    : passages

  const byTopic = {}
  const uncategorized = []

  for (const p of filtered) {
    if (p.topicId) {
      if (!byTopic[p.topicId]) byTopic[p.topicId] = []
      byTopic[p.topicId].push(p)
    } else {
      uncategorized.push(p)
    }
  }

  const groups = []
  for (const t of topics) {
    if (byTopic[t.id]?.length) {
      groups.push({ key: t.id, label: t.name, passages: byTopic[t.id] })
    }
  }
  if (uncategorized.length) {
    groups.push({ key: '__none__', label: 'Uncategorized', passages: uncategorized })
  }
  return groups
}

export default function PassageSidebar({ topics, passages, currentId, onSelect, onAdd, onDelete }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const groups = useMemo(
    () => groupPassages(passages, topics, search),
    [passages, topics, search]
  )

  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="w-full md:w-56 bg-slate-800 text-white flex flex-col flex-shrink-0 overflow-hidden">

      {/* Search */}
      <div className="p-2 pt-3">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search passages..."
            className="w-full bg-slate-700 text-white text-xs pl-7 pr-6 py-1.5 rounded-lg outline-none placeholder-slate-500 focus:bg-slate-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Topic groups */}
      <div className="flex-1 overflow-y-auto py-1">
        {groups.length === 0 && (
          <div className="px-3 py-4 text-xs text-slate-500 text-center">
            {search ? 'No passages found' : 'No passages yet'}
          </div>
        )}

        {groups.map(group => (
          <div key={group.key}>
            {/* Topic header */}
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 text-left"
            >
              <span className="text-xs">{collapsed[group.key] ? '▶' : '▼'}</span>
              <span className="text-xs font-semibold uppercase tracking-wider flex-1 truncate">
                {group.label}
              </span>
              <span className="text-xs text-slate-600">{group.passages.length}</span>
            </button>

            {/* Passages */}
            {!collapsed[group.key] && group.passages.map(p => {
              const due = getDueCount(p)
              return (
                <div
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={`group flex items-start gap-1 pl-5 pr-2 py-2 cursor-pointer border-l-2 text-xs
                    ${p.id === currentId
                      ? 'bg-slate-700 border-blue-400 text-white'
                      : 'border-transparent text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  <span className="flex-1 leading-snug">{p.title}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    {due > 0 && (
                      <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 leading-4">
                        {due}
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(p.id) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="m-2 py-2 text-sm text-slate-400 border border-dashed border-slate-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
      >
        + Add Passage
      </button>
    </div>
  )
}
