import { useMemo } from 'react'
import { getDueCount, isDue } from '../utils/sm2'

// ── Heatmap helpers ───────────────────────────────────────────

function getLast84Days(reviewHistory) {
  const map = Object.fromEntries((reviewHistory ?? []).map(r => [r.date, r.count]))
  const today = new Date()
  const days = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    days.push({ date, count: map[date] ?? 0, dow: d.getDay() })
  }
  return days
}

function heatColor(count) {
  if (count === 0) return 'bg-gray-200'
  if (count <= 3) return 'bg-green-200'
  if (count <= 7) return 'bg-green-400'
  return 'bg-green-600'
}

// Group 84 days into 12 columns (weeks), each column = 7 days
function toWeeks(days) {
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Stats helpers ─────────────────────────────────────────────

function computeStats(passages) {
  let totalVocab = 0, mastered = 0, totalDue = 0
  for (const p of passages) {
    const vocab = p.vocabulary ?? []
    totalVocab += vocab.length
    mastered += vocab.filter(v => (v.sentences ?? []).length >= 3).length
    totalDue += getDueCount(p)
  }
  return { totalVocab, mastered, totalDue }
}

// ── Component ─────────────────────────────────────────────────

export default function Dashboard({ state, onClose }) {
  const { passages, topics, settings } = state
  const { streak, reviewHistory } = settings

  const stats = useMemo(() => computeStats(passages), [passages])
  const days = useMemo(() => getLast84Days(reviewHistory), [reviewHistory])
  const weeks = useMemo(() => toWeeks(days), [days])

  // Passages grouped by topic for the bar chart
  const topicGroups = useMemo(() => {
    const map = {}
    for (const p of passages) {
      const key = p.topicId ?? '__none__'
      map[key] = (map[key] ?? 0) + 1
    }
    const result = Object.entries(map)
      .map(([key, count]) => ({
        name: key === '__none__' ? 'Uncategorized' : (topics.find(t => t.id === key)?.name ?? 'Unknown'),
        count,
      }))
      .sort((a, b) => b.count - a.count)
    return result
  }, [passages, topics])

  const maxTopicCount = topicGroups[0]?.count ?? 1

  // Month labels for heatmap x-axis
  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const month = new Date(week[0].date).getMonth()
      if (month !== lastMonth) {
        labels.push({ wi, label: MONTH_LABELS[month] })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Progress Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon="📚" value={passages.length} label="Passages" color="blue" />
            <StatCard icon="📝" value={stats.totalVocab} label="Words saved" color="purple" />
            <StatCard icon="✓" value={stats.mastered} label="Mastered" color="green" />
            <StatCard
              icon="🔥"
              value={streak?.current ?? 0}
              label={`day streak`}
              color="orange"
              suffix={streak?.current === 1 ? '' : 's'}
            />
          </div>

          {/* Due today */}
          {stats.totalDue > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-xl">⏰</span>
              <span className="text-sm text-amber-800 font-medium">
                {stats.totalDue} item{stats.totalDue > 1 ? 's' : ''} due for review today
              </span>
            </div>
          )}

          {/* Activity heatmap */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Review Activity — last 12 weeks
            </h3>
            <div className="overflow-x-auto">
              {/* Month labels */}
              <div className="flex gap-1 mb-1 pl-7">
                {weeks.map((_, wi) => {
                  const ml = monthLabels.find(m => m.wi === wi)
                  return (
                    <div key={wi} className="w-3 flex-shrink-0 text-xs text-gray-400 leading-none">
                      {ml ? ml.label : ''}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col gap-1 mr-1">
                  {DOW.map((d, i) => (
                    <div key={i} className="w-5 h-3 text-xs text-gray-400 leading-3 text-right">
                      {i % 2 === 1 ? d.slice(0, 1) : ''}
                    </div>
                  ))}
                </div>
                {/* Grid */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        title={`${day.date}: ${day.count} review${day.count !== 1 ? 's' : ''}`}
                        className={`w-3 h-3 rounded-sm cursor-default ${heatColor(day.count)}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                <span>Less</span>
                {[0, 2, 5, 8].map(n => (
                  <div key={n} className={`w-3 h-3 rounded-sm ${heatColor(n)}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Passages by topic */}
          {topicGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Passages by Topic
              </h3>
              <div className="space-y-2">
                {topicGroups.map(g => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-28 truncate flex-shrink-0">
                      {g.name}
                    </span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(g.count / maxTopicCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-4 text-right flex-shrink-0">
                      {g.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary mastery */}
          {stats.totalVocab > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Vocabulary Mastery
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(stats.mastered / stats.totalVocab) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {stats.mastered} / {stats.totalVocab} mastered
                </span>
              </div>
            </div>
          )}

          {/* Recent passages */}
          {passages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Recent Passages
              </h3>
              <div className="space-y-1.5">
                {[...passages]
                  .sort((a, b) => (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? ''))
                  .slice(0, 5)
                  .map(p => {
                    const due = getDueCount(p)
                    const topic = topics.find(t => t.id === p.topicId)
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 text-sm text-gray-700 py-1"
                      >
                        <span className="flex-1 truncate">{p.title}</span>
                        {topic && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 rounded-full">
                            {topic.name}
                          </span>
                        )}
                        {p.difficulty && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full">
                            Band {p.difficulty}
                          </span>
                        )}
                        {due > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 rounded-full">
                            {due} due
                          </span>
                        )}
                        {p.lastReadAt && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatRelative(p.lastReadAt)}
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ icon, value, label, color, suffix = '' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green:  'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}{suffix}</div>
      <div className="text-xs opacity-80 mt-0.5">{label}</div>
    </div>
  )
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}
