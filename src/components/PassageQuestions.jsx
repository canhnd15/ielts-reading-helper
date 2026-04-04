import { useState } from 'react'

function QuestionItem({ item, passageId, onRemove, onUpdate }) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editQ, setEditQ] = useState(item.question)
  const [editA, setEditA] = useState(item.answer)

  function saveEdit() {
    if (!editQ.trim() || !editA.trim()) return
    onUpdate(passageId, item.id, editQ, editA)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="border border-blue-300 rounded-lg p-3 bg-blue-50 space-y-2">
        <textarea
          value={editQ}
          onChange={e => setEditQ(e.target.value)}
          rows={2}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none"
          placeholder="Question"
        />
        <textarea
          value={editA}
          onChange={e => setEditA(e.target.value)}
          rows={2}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none"
          placeholder="Answer"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { setEditing(false); setEditQ(item.question); setEditA(item.answer) }}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={saveEdit}
            disabled={!editQ.trim() || !editA.trim()}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Question row */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-white">
        <span className="text-xs font-bold text-blue-600 mt-0.5 flex-shrink-0">Q</span>
        <p className="flex-1 text-sm text-gray-800 leading-snug">{item.question}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowAnswer(v => !v)}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {showAnswer ? 'Hide' : 'Answer'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-1.5 py-1 text-gray-400 hover:text-blue-500"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => onRemove(passageId, item.id)}
            className="text-xs px-1.5 py-1 text-gray-300 hover:text-red-400"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Answer row */}
      {showAnswer && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border-t border-gray-100">
          <span className="text-xs font-bold text-green-600 mt-0.5 flex-shrink-0">A</span>
          <p className="flex-1 text-sm text-gray-700 leading-snug">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function PassageQuestions({ passage, onAdd, onRemove, onUpdate }) {
  const [formOpen, setFormOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const questions = passage?.questions ?? []

  function handleAdd() {
    if (!question.trim() || !answer.trim()) return
    onAdd(passage.id, question, answer)
    setQuestion('')
    setAnswer('')
    setFormOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.metaKey) handleAdd()
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
          Questions
          {questions.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case tracking-normal">
              {questions.length}
            </span>
          )}
        </h2>
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Question
          </button>
        )}
      </div>

      {/* Add form */}
      {formOpen && (
        <div className="border border-blue-300 rounded-lg p-3 bg-blue-50 mb-3 space-y-2">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            autoFocus
            className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none"
            placeholder="Question…"
          />
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none"
            placeholder="Answer…"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setFormOpen(false); setQuestion(''); setAnswer('') }}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!question.trim() || !answer.trim()}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Question list */}
      {questions.length === 0 && !formOpen ? (
        <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
          No questions yet. Add questions to test your comprehension.
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex gap-2.5 items-start">
              <span className="text-xs text-gray-400 mt-3 w-5 text-right flex-shrink-0">{i + 1}.</span>
              <div className="flex-1">
                <QuestionItem
                  item={q}
                  passageId={passage.id}
                  onRemove={onRemove}
                  onUpdate={onUpdate}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
