import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ielts_reader_v1'

const SR_DEFAULTS = { interval: 1, repetitions: 0, easeFactor: 2.5, dueDate: null }

// Migrate old data to new shape
function migrate(raw) {
  return {
    topics: raw.topics ?? [],
    currentPassageId: raw.currentPassageId ?? null,
    settings: { targetLang: 'vi', ...(raw.settings ?? {}) },
    passages: (raw.passages ?? []).map(p => ({
      topicId: null,
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
  settings: { targetLang: 'vi' },
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

  // ── Topics ─────────────────────────────────────────��───────
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
  const addPassage = useCallback((title, text, topicId = null) => {
    const id = Date.now().toString()
    setState(s => ({
      ...s,
      passages: [...s.passages, {
        id,
        title: title.trim() || 'Untitled Passage',
        text: text.trim(),
        topicId,
        notes: '',
        highlights: [],
        vocabulary: [],
      }],
      currentPassageId: id,
    }))
  }, [])

  const editPassage = useCallback((id, title, text, topicId) => {
    updatePassage(id, () => ({
      title: title.trim() || 'Untitled Passage',
      text: text.trim(),
      topicId: topicId ?? null,
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
    setState(s => ({ ...s, currentPassageId: id }))
  }, [])

  const setTargetLang = useCallback((lang) => {
    setState(s => ({ ...s, settings: { ...s.settings, targetLang: lang } }))
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
    updatePassage(passageId, p => ({
      highlights: p.highlights.map(h => h.id === hlId ? { ...h, ...srUpdate } : h),
    }))
  }, [updatePassage])

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
    updatePassage(passageId, p => ({
      vocabulary: p.vocabulary.map(v => v.id === vocabId ? { ...v, ...srUpdate } : v),
    }))
  }, [updatePassage])

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

  // Replace entire state with imported data (after migration/validation)
  const importData = useCallback((raw) => {
    setState(migrate(raw))
  }, [])

  return {
    state,
    currentPassage,
    addTopic,
    deleteTopic,
    addPassage,
    editPassage,
    deletePassage,
    importData,
    selectPassage,
    setTargetLang,
    addHighlight,
    removeHighlight,
    reviewHighlight,
    saveVocabWord,
    removeVocabWord,
    reviewVocab,
    addSentence,
    updateNotes,
  }
}
