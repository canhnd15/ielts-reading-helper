import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ielts_reader_v1'

const SR_DEFAULTS = { interval: 1, repetitions: 0, easeFactor: 2.5, dueDate: null }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function computeStreak(streak, today) {
  if (!streak.lastDate) return { current: 1, lastDate: today }
  if (streak.lastDate === today) return streak
  const diff = Math.round(
    (new Date(today) - new Date(streak.lastDate)) / 86400000
  )
  return diff === 1
    ? { current: streak.current + 1, lastDate: today }
    : { current: 1, lastDate: today }
}

function recordReviewInSettings(settings) {
  const today = todayStr()
  const history = settings.reviewHistory ?? []
  const existing = history.find(r => r.date === today)
  const reviewHistory = existing
    ? history.map(r => r.date === today ? { ...r, count: r.count + 1 } : r)
    : [...history, { date: today, count: 1 }]
  const streak = computeStreak(settings.streak ?? { current: 0, lastDate: null }, today)
  return { ...settings, reviewHistory, streak }
}

function migrate(raw) {
  return {
    topics: raw.topics ?? [],
    currentPassageId: raw.currentPassageId ?? null,
    settings: {
      targetLang: 'vi',
      fontSize: 17,
      streak: { current: 0, lastDate: null },
      reviewHistory: [],
      ...(raw.settings ?? {}),
    },
    passages: (raw.passages ?? []).map(p => ({
      topicId: null,
      difficulty: null,
      lastReadAt: null,
      ...p,
      vocabulary: (p.vocabulary ?? []).map(v => ({
        sentences: [],
        ...SR_DEFAULTS,
        ...v,
      })),
      highlights: (p.highlights ?? []).map(h => ({
        ...SR_DEFAULTS,
        ...h,
      })),
      questions: typeof p.questions === 'string' ? p.questions : '',
      examNotes: (p.examNotes ?? []),
      annotations: (p.annotations ?? []),
      paragraphNotes: (p.paragraphNotes ?? {}),
    })),
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {}
  return null
}

const defaultState = {
  topics: [],
  passages: [],
  currentPassageId: null,
  settings: {
    targetLang: 'vi',
    fontSize: 17,
    streak: { current: 0, lastDate: null },
    reviewHistory: [],
  },
}

export function useStore() {
  const [state, setState] = useState(() => loadFromStorage() ?? defaultState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const currentPassage = state.passages.find(p => p.id === state.currentPassageId) ?? null

  const updatePassage = useCallback((id, updater) => {
    setState(s => ({
      ...s,
      passages: s.passages.map(p => p.id === id ? { ...p, ...updater(p) } : p),
    }))
  }, [])

  // ── Settings ───────────────────────────────────────────────
  const setTargetLang = useCallback((v) => setState(s => ({ ...s, settings: { ...s.settings, targetLang: v } })), [])
  const setFontSize   = useCallback((v) => setState(s => ({ ...s, settings: { ...s.settings, fontSize: v } })), [])

  // ── Topics ─────────────────────────────────────────────────
  const addTopic = useCallback((name) => {
    const id = Date.now().toString()
    setState(s => ({ ...s, topics: [...s.topics, { id, name: name.trim() }] }))
    return id
  }, [])

  const deleteTopic = useCallback((id) => {
    setState(s => ({
      ...s,
      topics: s.topics.filter(t => t.id !== id),
      passages: s.passages.map(p => p.topicId === id ? { ...p, topicId: null } : p),
    }))
  }, [])

  // ── Passages ───────────────────────────────────────────────
  const addPassage = useCallback((title, text, topicId = null, questions = '') => {
    const id = Date.now().toString()
    setState(s => ({
      ...s,
      passages: [...s.passages, {
        id,
        title: title.trim() || 'Untitled Passage',
        text: text.trim(),
        topicId,
        difficulty: null,
        lastReadAt: null,
        notes: '',
        questions: questions.trim(),
        highlights: [],
        annotations: [],
        paragraphNotes: {},
        vocabulary: [],
      }],
      currentPassageId: id,
    }))
  }, [])

  const editPassage = useCallback((id, title, text, topicId, questions = '') => {
    updatePassage(id, () => ({
      title: title.trim() || 'Untitled Passage',
      text: text.trim(),
      topicId: topicId ?? null,
      questions: questions.trim(),
    }))
  }, [updatePassage])

  const deletePassage = useCallback((id) => {
    setState(s => {
      const passages = s.passages.filter(p => p.id !== id)
      const currentPassageId = s.currentPassageId === id
        ? (passages[0]?.id ?? null)
        : s.currentPassageId
      return { ...s, passages, currentPassageId }
    })
  }, [])

  const selectPassage = useCallback((id) => {
    setState(s => ({
      ...s,
      currentPassageId: id,
      passages: s.passages.map(p =>
        p.id === id ? { ...p, lastReadAt: new Date().toISOString() } : p
      ),
    }))
  }, [])

  const setDifficulty = useCallback((passageId, difficulty) => {
    updatePassage(passageId, () => ({ difficulty }))
  }, [updatePassage])

  const importData = useCallback((raw) => {
    setState(migrate(raw))
  }, [])

  // ── Highlights ─────────────────────────────────────────────
  const addHighlight = useCallback((passageId, start, end, color) => {
    updatePassage(passageId, p => ({
      highlights: [...p.highlights, { id: Date.now().toString(), start, end, color, ...SR_DEFAULTS }],
    }))
  }, [updatePassage])

  const removeHighlight = useCallback((passageId, hlId) => {
    updatePassage(passageId, p => ({
      highlights: p.highlights.filter(h => h.id !== hlId),
    }))
  }, [updatePassage])

  const reviewHighlight = useCallback((passageId, hlId, srUpdate) => {
    setState(s => ({
      ...s,
      settings: recordReviewInSettings(s.settings),
      passages: s.passages.map(p =>
        p.id === passageId
          ? { ...p, highlights: p.highlights.map(h => h.id === hlId ? { ...h, ...srUpdate } : h) }
          : p
      ),
    }))
  }, [])

  // ── Vocabulary ─────────────────────────────────────────────
  const saveVocabWord = useCallback((passageId, word, data) => {
    updatePassage(passageId, p => {
      if (p.vocabulary.some(v => v.word.toLowerCase() === word.toLowerCase())) return {}
      return {
        vocabulary: [...p.vocabulary, {
          id: Date.now().toString(), word, ...data, ...SR_DEFAULTS, sentences: [],
        }],
      }
    })
  }, [updatePassage])

  const removeVocabWord = useCallback((passageId, vocabId) => {
    updatePassage(passageId, p => ({
      vocabulary: p.vocabulary.filter(v => v.id !== vocabId),
    }))
  }, [updatePassage])

  const reviewVocab = useCallback((passageId, vocabId, srUpdate) => {
    setState(s => ({
      ...s,
      settings: recordReviewInSettings(s.settings),
      passages: s.passages.map(p =>
        p.id === passageId
          ? { ...p, vocabulary: p.vocabulary.map(v => v.id === vocabId ? { ...v, ...srUpdate } : v) }
          : p
      ),
    }))
  }, [])

  const addSentence = useCallback((passageId, vocabId, sentence) => {
    updatePassage(passageId, p => ({
      vocabulary: p.vocabulary.map(v =>
        v.id === vocabId
          ? { ...v, sentences: [...(v.sentences ?? []), sentence.trim()] }
          : v
      ),
    }))
  }, [updatePassage])

  const updateNotes = useCallback((passageId, notes) => {
    updatePassage(passageId, () => ({ notes }))
  }, [updatePassage])

  // ── Paragraph notes (translations) ─────────────────────────
  const updateParagraphNote = useCallback((passageId, paraIndex, note) => {
    updatePassage(passageId, p => {
      const paragraphNotes = { ...(p.paragraphNotes ?? {}) }
      if (note.trim()) paragraphNotes[paraIndex] = note
      else delete paragraphNotes[paraIndex]
      return { paragraphNotes }
    })
  }, [updatePassage])

  // ── Annotations ───────────────────────────────────────────
  const addAnnotation = useCallback((passageId, start, end, note) => {
    updatePassage(passageId, p => ({
      annotations: [...(p.annotations ?? []), { id: Date.now().toString(), start, end, note }],
    }))
  }, [updatePassage])

  const removeAnnotation = useCallback((passageId, annId) => {
    updatePassage(passageId, p => ({
      annotations: (p.annotations ?? []).filter(a => a.id !== annId),
    }))
  }, [updatePassage])

  // ── Questions ──────────────────────────────────────────────
  const updateQuestions = useCallback((passageId, questions) => {
    updatePassage(passageId, () => ({ questions }))
  }, [updatePassage])

  // ── Exam notes ─────────────────────────────────────────────
  const updateExamNotes = useCallback((passageId, examNotes) => {
    updatePassage(passageId, () => ({ examNotes }))
  }, [updatePassage])

  return {
    state,
    currentPassage,
    setTargetLang,
    setFontSize,
    addTopic,
    deleteTopic,
    addPassage,
    editPassage,
    deletePassage,
    selectPassage,
    setDifficulty,
    importData,
    addHighlight,
    removeHighlight,
    reviewHighlight,
    saveVocabWord,
    removeVocabWord,
    reviewVocab,
    addSentence,
    updateNotes,
    updateQuestions,
    updateExamNotes,
    updateParagraphNote,
    addAnnotation,
    removeAnnotation,
  }
}
