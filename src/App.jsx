import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from './hooks/useStore'
import { useTranslation } from './hooks/useTranslation'
import { getDueCount } from './utils/sm2'
import PassageSidebar from './components/PassageSidebar'
import PassageText from './components/PassageText'
import SelectionToolbar from './components/SelectionToolbar'
import TranslationPopup from './components/TranslationPopup'
import RightPanel from './components/RightPanel'
import AddPassageModal from './components/AddPassageModal'
import LearningMode from './components/LearningMode'
import Dashboard from './components/Dashboard'

const LANGUAGES = [
  { code: 'vi', label: 'Vietnamese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
]

const DIFFICULTIES = ['5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0']

export default function App() {
  const store = useStore()
  const { popup, translate, closePopup } = useTranslation()
  const [selection, setSelection]       = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [learningOpen, setLearningOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [speaking, setSpeaking]         = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const [mobileView, setMobileView]     = useState('sidebar')
  const importRef = useRef(null)

  const { currentPassage, state } = store
  const { darkMode, fontSize, streak } = state.settings

  // Apply dark mode class to document root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Stop TTS when passage changes
  useEffect(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
    setReadProgress(0)
  }, [state.currentPassageId])

  // Cleanup TTS on unmount
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  // ── Reading interactions ────────────────────────────────────
  const handleWordClick = useCallback((word, x, y, hlId) => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
    translate(word, x, y, { hlId, targetLang: state.settings.targetLang })
  }, [translate, state.settings.targetLang])

  const handleTextSelect = useCallback((sel) => {
    closePopup()
    setSelection(sel)
  }, [closePopup])

  const handleHighlight = useCallback((color) => {
    if (!selection || !currentPassage) return
    store.addHighlight(currentPassage.id, selection.start, selection.end, color)
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [selection, currentPassage, store])

  const handleSaveWord = useCallback(() => {
    if (!popup?.data || !currentPassage) return
    store.saveVocabWord(currentPassage.id, popup.word, popup.data)
    closePopup()
  }, [popup, currentPassage, store, closePopup])

  const handleRemoveHighlight = useCallback((hlId) => {
    if (!currentPassage) return
    store.removeHighlight(currentPassage.id, hlId)
  }, [currentPassage, store])

  const handleSelectPassage = useCallback((id) => {
    store.selectPassage(id)
    setMobileView('reading')
  }, [store])

  const handleDeletePassage = useCallback((id) => {
    if (confirm('Delete this passage?')) store.deletePassage(id)
  }, [store])

  const handleEditPassage = useCallback((title, text, topicId) => {
    if (currentPassage) store.editPassage(currentPassage.id, title, text, topicId)
  }, [currentPassage, store])

  // ── Text-to-speech ──────────────────────────────────────────
  const handleSpeak = useCallback(() => {
    if (!currentPassage) return
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(currentPassage.text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.onend  = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }, [currentPassage])

  // ── Reading progress ────────────────────────────────────────
  const handleScroll = useCallback((e) => {
    const el = e.currentTarget
    const max = el.scrollHeight - el.clientHeight
    setReadProgress(max > 0 ? Math.round((el.scrollTop / max) * 100) : 100)
  }, [])

  // ── Export / Import ─────────────────────────────────────────
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ielts-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        const pc = raw.passages?.length ?? 0
        const tc = raw.topics?.length ?? 0
        if (confirm(`Import: ${pc} passage(s), ${tc} topic(s).\nThis will REPLACE all current data. Continue?`)) {
          store.importData(raw)
        }
      } catch {
        alert('Invalid file. Please select a valid IELTS backup JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [store])

  const topicName = currentPassage?.topicId
    ? state.topics.find(t => t.id === currentPassage.topicId)?.name
    : null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-2 bg-blue-900 text-white flex-shrink-0">
        <h1 className="text-sm font-semibold tracking-wide whitespace-nowrap">IELTS Reader</h1>

        {/* Streak */}
        {streak?.current > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-300 bg-amber-900/40 px-2 py-1 rounded-full">
            🔥 {streak.current}d
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Translate to */}
          <span className="text-xs text-blue-300 hidden sm:inline">Translate:</span>
          <select
            value={state.settings.targetLang}
            onChange={e => store.setTargetLang(e.target.value)}
            className="text-xs bg-blue-800 border border-blue-700 text-white rounded px-2 py-1 outline-none"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>

          {/* Dashboard */}
          <button
            onClick={() => setDashboardOpen(true)}
            className="text-xs px-2 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors"
            title="Progress dashboard"
          >
            📊 <span className="hidden sm:inline">Stats</span>
          </button>

          {/* Dark mode */}
          <button
            onClick={store.toggleDarkMode}
            className="hidden sm:inline-flex text-xs px-2 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors"
            title="Toggle dark mode"
          >
            {darkMode ? '☀' : '☾'}
          </button>

          {/* Export / Import */}
          <button onClick={handleExport} className="hidden sm:inline-flex text-xs px-2 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors">
            ↓
          </button>
          <button onClick={() => importRef.current?.click()} className="hidden sm:inline-flex text-xs px-2 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors">
            ↑
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar: full-screen on mobile, fixed-width on desktop */}
        <div className={`${mobileView === 'sidebar' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-auto flex-shrink-0`}>
          <PassageSidebar
            topics={state.topics}
            passages={state.passages}
            currentId={state.currentPassageId}
            onSelect={handleSelectPassage}
            onAdd={() => { setAddModalOpen(true); setMobileView('reading') }}
            onDelete={handleDeletePassage}
          />
        </div>

        {/* Reading area */}
        <main className={`${mobileView === 'reading' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden`}>
          {currentPassage ? (
            <>
              {/* Passage toolbar */}
              <div className="flex flex-col border-b border-gray-100 bg-white flex-shrink-0">
                {/* Row 1: title + topic + difficulty */}
                <div className="flex items-center gap-2 px-3 pt-2 pb-1 min-w-0">
                  <span className="font-semibold text-sm text-gray-700 truncate flex-1 min-w-0">
                    {currentPassage.title}
                  </span>
                  {topicName && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      {topicName}
                    </span>
                  )}
                  <select
                    value={currentPassage.difficulty ?? ''}
                    onChange={e => store.setDifficulty(currentPassage.id, e.target.value || null)}
                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 outline-none flex-shrink-0"
                    title="IELTS difficulty band"
                  >
                    <option value="">Band</option>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>Band {d}</option>)}
                  </select>
                </div>

                {/* Row 2: controls */}
                <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
                  {/* Font size */}
                  <button
                    onClick={() => store.setFontSize(Math.max(13, fontSize - 1))}
                    className="text-xs w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100"
                    title="Decrease font size"
                  >A-</button>
                  <span className="text-xs text-gray-400 w-5 text-center">{fontSize}</span>
                  <button
                    onClick={() => store.setFontSize(Math.min(24, fontSize + 1))}
                    className="text-xs w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100"
                    title="Increase font size"
                  >A+</button>

                  <div className="w-px h-4 bg-gray-200 mx-0.5" />

                  {/* TTS */}
                  <button
                    onClick={handleSpeak}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex-shrink-0 ${
                      speaking
                        ? 'bg-red-100 border-red-300 text-red-600'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                    title={speaking ? 'Stop reading' : 'Read passage aloud'}
                  >
                    {speaking ? '⏹ Stop' : '🔊 Listen'}
                  </button>

                  <div className="w-px h-4 bg-gray-200 mx-0.5" />

                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePassage(currentPassage.id)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-red-500 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Reading progress bar */}
              <div className="h-0.5 bg-gray-100 flex-shrink-0">
                <div
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${readProgress}%` }}
                />
              </div>

              {/* Passage content */}
              <div
                className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-8 bg-white"
                onScroll={handleScroll}
              >
                <div
                  className="passage-text max-w-2xl mx-auto text-gray-800"
                  style={{ fontSize }}
                >
                  <PassageText
                    passage={currentPassage}
                    onWordClick={handleWordClick}
                    onTextSelect={handleTextSelect}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white">
              <div className="text-5xl">📖</div>
              <p className="font-medium text-gray-500">No passage selected</p>
              <p className="text-sm text-center max-w-xs leading-relaxed text-gray-400">
                Add an IELTS reading passage to get started.
                Click words to translate, select text to highlight.
              </p>
              <button
                onClick={() => setAddModalOpen(true)}
                className="mt-2 px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800"
              >
                Add First Passage
              </button>
            </div>
          )}
        </main>

        {/* Right panel: full-screen on mobile, fixed-width on desktop */}
        <div className={`${mobileView === 'notes' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-auto flex-shrink-0`}>
          <RightPanel
            passage={currentPassage}
            onUpdateNotes={store.updateNotes}
            onRemoveVocab={store.removeVocabWord}
            onRemoveHighlight={handleRemoveHighlight}
            onAddSentence={store.addSentence}
            onStartLearning={() => setLearningOpen(true)}
          />
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden flex border-t border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => setMobileView('sidebar')}
          className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${
            mobileView === 'sidebar' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-base leading-none">📚</span>
          <span>Passages</span>
        </button>
        <button
          onClick={() => setMobileView('reading')}
          className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${
            mobileView === 'reading' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-base leading-none">📖</span>
          <span>Read</span>
        </button>
        <button
          onClick={() => setMobileView('notes')}
          className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${
            mobileView === 'notes' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="relative text-base leading-none">
            📝
            {currentPassage && getDueCount(currentPassage) > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {getDueCount(currentPassage)}
              </span>
            )}
          </span>
          <span>Notes</span>
        </button>
      </nav>

      {/* Overlays */}
      <SelectionToolbar
        selection={selection}
        onHighlight={handleHighlight}
        onClose={() => { setSelection(null); window.getSelection()?.removeAllRanges() }}
      />

      <TranslationPopup
        popup={popup}
        onSave={handleSaveWord}
        onRemoveHighlight={handleRemoveHighlight}
        onClose={closePopup}
      />

      <AddPassageModal
        open={addModalOpen}
        topics={state.topics}
        mode="add"
        onAdd={store.addPassage}
        onAddTopic={store.addTopic}
        onClose={() => setAddModalOpen(false)}
      />

      <AddPassageModal
        open={editModalOpen}
        topics={state.topics}
        mode="edit"
        initialValues={currentPassage ? {
          title: currentPassage.title,
          text: currentPassage.text,
          topicId: currentPassage.topicId ?? '',
        } : null}
        onEdit={handleEditPassage}
        onAddTopic={store.addTopic}
        onClose={() => setEditModalOpen(false)}
      />

      {learningOpen && currentPassage && (
        <LearningMode
          passage={currentPassage}
          onClose={() => setLearningOpen(false)}
          onReviewVocab={store.reviewVocab}
          onReviewHighlight={store.reviewHighlight}
          onAddSentence={store.addSentence}
        />
      )}

      {dashboardOpen && (
        <Dashboard state={state} onClose={() => setDashboardOpen(false)} />
      )}
    </div>
  )
}
