import { useState, useCallback } from 'react'

export function useTranslation() {
  const [popup, setPopup] = useState(null)

  const translate = useCallback(async (word, x, y, { hlId = null, targetLang = 'vi' }) => {
    setPopup({ word, data: null, loading: true, error: null, x, y, hlId })

    try {
      // Fire both requests in parallel
      const [dictRes, transRes] = await Promise.all([
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`),
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${targetLang}`),
      ])

      // ── Dictionary ──────────────────────────────────────────
      let pronunciation = '', pos = '', definition = '', examples = []

      if (dictRes.ok) {
        const entries = await dictRes.json()
        const entry = entries[0]

        pronunciation =
          entry.phonetic ||
          entry.phonetics?.find(p => p.text)?.text ||
          ''

        entry.meanings?.forEach(meaning => {
          if (!pos) pos = meaning.partOfSpeech ?? ''
          if (!definition) definition = meaning.definitions?.[0]?.definition ?? ''
          meaning.definitions?.forEach(d => {
            if (d.example && examples.length < 3) examples.push(d.example)
          })
        })
      }

      // ── Translation ─────────────────────────────────────────
      let vietnamese = ''
      if (transRes.ok) {
        const transData = await transRes.json()
        vietnamese = transData.responseData?.translatedText ?? ''
      }

      setPopup(prev =>
        prev?.word === word
          ? { ...prev, data: { pronunciation, pos, definition, examples, vietnamese }, loading: false }
          : prev
      )
    } catch (err) {
      setPopup(prev =>
        prev?.word === word
          ? { ...prev, loading: false, error: err.message }
          : prev
      )
    }
  }, [])

  const closePopup = useCallback(() => setPopup(null), [])

  return { popup, translate, closePopup }
}
