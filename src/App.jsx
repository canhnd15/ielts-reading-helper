import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from './hooks/useStore'
import { useTranslation } from './hooks/useTranslation'
import PassageSidebar from './components/PassageSidebar'
import PassageText from './components/PassageText'
import SelectionToolbar from './components/SelectionToolbar'
import TranslationPopup from './components/TranslationPopup'
import RightPanel from './components/RightPanel'
import AddPassageModal from './components/AddPassageModal'
import LearningMode from './components/LearningMode'
import Dashboard from './components/Dashboard'
import QuestionsSection from './components/QuestionsSection'

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

  const handleDeletePassage = useCallback((id) => {
    if (confirm('Delete this passage?')) store.deletePassage(id)
  }, [store])

  const handleEditPassage = useCallback((title, text, topicId, questions) => {
    if (currentPassage) store.editPassage(currentPassage.id, title, text, topicId, questions)
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
      <header className="flex items-center gap-3 px-4 py-2 bg-blue-900 text-white flex-shrink-0">
        <h1 className="text-sm font-semibold tracking-wide whitespace-nowrap">IELTS Reading Helper</h1>

        {/* Streak */}
        {streak?.current > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-300 bg-amber-900/40 px-2 py-1 rounded-full">
            🔥 {streak.current}d
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          {/* Translate to */}
          <span className="text-xs text-blue-300 hidden sm:inline">Translate:</span>
          <select
            value={state.settings.targetLang}
            onChange={e => store.setTargetLang(e.target.value)}
            className="text-xs bg-blue-800 border border-blue-700 text-white rounded px-2 py-1 outline-none"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>

          <div className="w-px h-4 bg-blue-700" />

          {/* Dashboard */}
          <button
            onClick={() => setDashboardOpen(true)}
            className="text-xs px-2.5 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors"
            title="Progress dashboard"
          >
            📊 Stats
          </button>

          {/* Dark mode */}
          <button
            onClick={store.toggleDarkMode}
            className="text-xs px-2.5 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors"
            title="Toggle dark mode"
          >
            {darkMode ? '☀ Light' : '☾ Dark'}
          </button>

          <div className="w-px h-4 bg-blue-700" />

          {/* Export / Import */}
          <button onClick={handleExport} className="text-xs px-2.5 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors">
            ↓ Export
          </button>
          <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors">
            ↑ Import
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        <PassageSidebar
          topics={state.topics}
          passages={state.passages}
          currentId={state.currentPassageId}
          onSelect={store.selectPassage}
          onAdd={() => setAddModalOpen(true)}
          onDelete={handleDeletePassage}
        />

        {/* Reading area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentPassage ? (
            <>
              {/* Passage toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
                {/* Left: title + topic + difficulty */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-semibold text-sm text-gray-700 truncate">
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

                {/* Right: controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
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
                className="flex-1 overflow-y-auto px-10 py-8 bg-white"
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

                <QuestionsSection
                  passage={currentPassage}
                  onUpdate={store.updateQuestions}
                  fontSize={fontSize}
                />
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

        <RightPanel
          passage={currentPassage}
          onUpdateNotes={store.updateNotes}
          onRemoveVocab={store.removeVocabWord}
          onRemoveHighlight={handleRemoveHighlight}
          onAddSentence={store.addSentence}
          onStartLearning={() => setLearningOpen(true)}
        />
      </div>

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
          questions: currentPassage.questions ?? '',
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
