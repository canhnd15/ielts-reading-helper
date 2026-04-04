import { useState, useCallback, useRef } from 'react'
import { useStore } from './hooks/useStore'
import { useTranslation } from './hooks/useTranslation'
import PassageSidebar from './components/PassageSidebar'
import PassageText from './components/PassageText'
import SelectionToolbar from './components/SelectionToolbar'
import TranslationPopup from './components/TranslationPopup'
import RightPanel from './components/RightPanel'
import AddPassageModal from './components/AddPassageModal'
import LearningMode from './components/LearningMode'

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

export default function App() {
  const store = useStore()
  const { popup, translate, closePopup } = useTranslation()
  const [selection, setSelection] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [learningOpen, setLearningOpen] = useState(false)
  const importRef = useRef(null)

  const { currentPassage, state } = store

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

  const handleEditPassage = useCallback((title, text, topicId) => {
    if (currentPassage) store.editPassage(currentPassage.id, title, text, topicId)
  }, [currentPassage, store])

  // ── Export ──────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ielts-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  // ── Import ──────────────────────────────────────────────────
  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        const passageCount = raw.passages?.length ?? 0
        const topicCount = raw.topics?.length ?? 0
        if (confirm(
          `Import file contains ${passageCount} passage(s) and ${topicCount} topic(s).\n\nThis will REPLACE all current data. Continue?`
        )) {
          store.importData(raw)
        }
      } catch {
        alert('Invalid file. Please select a valid IELTS backup JSON.')
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }, [store])

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-2.5 bg-blue-900 text-white flex-shrink-0">
        <h1 className="text-base font-semibold tracking-wide">IELTS Reading Helper</h1>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-blue-300">Translate to:</span>
          <select
            value={state.settings.targetLang}
            onChange={e => store.setTargetLang(e.target.value)}
            className="text-xs bg-blue-800 border border-blue-700 text-white rounded px-2 py-1 outline-none"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          <div className="w-px h-4 bg-blue-700 mx-1" />

          <button
            onClick={handleExport}
            title="Export all data as JSON"
            className="text-xs px-3 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors"
          >
            ↓ Export
          </button>
          <button
            onClick={() => importRef.current?.click()}
            title="Import data from JSON backup"
            className="text-xs px-3 py-1 border border-blue-700 text-blue-300 rounded hover:text-white hover:border-blue-500 transition-colors"
          >
            ↑ Import
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
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
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {currentPassage ? (
            <>
              <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-700">{currentPassage.title}</span>
                  {currentPassage.topicId && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {state.topics.find(t => t.id === currentPassage.topicId)?.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1 flex-shrink-0"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeletePassage(currentPassage.id)}
                  className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded px-2 py-1 flex-shrink-0"
                >
                  Delete
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-10 py-8">
                <PassageText
                  passage={currentPassage}
                  onWordClick={handleWordClick}
                  onTextSelect={handleTextSelect}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="text-5xl">📖</div>
              <p className="font-medium text-gray-500">No passage selected</p>
              <p className="text-sm text-center max-w-xs leading-relaxed">
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

      {/* Add passage modal */}
      <AddPassageModal
        open={addModalOpen}
        topics={state.topics}
        mode="add"
        onAdd={store.addPassage}
        onAddTopic={store.addTopic}
        onClose={() => setAddModalOpen(false)}
      />

      {/* Edit passage modal */}
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
    </div>
  )
}
