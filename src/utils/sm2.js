/**
 * Simplified SM-2 spaced repetition algorithm.
 * quality: 0=Again | 1=Hard | 2=Good | 3=Easy
 */
export function applyReview(item, quality) {
  let { interval = 1, repetitions = 0, easeFactor = 2.5 } = item

  if (quality === 0) {
    interval = 1
    repetitions = 0
  } else {
    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)
    )
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions += 1
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + interval)

  return { interval, repetitions, easeFactor, dueDate: dueDate.toISOString() }
}

export function isDue(item) {
  if (!item.dueDate) return true
  return new Date(item.dueDate) <= new Date()
}

export function getDueCount(passage) {
  const v = (passage.vocabulary ?? []).filter(isDue).length
  const h = (passage.highlights ?? []).filter(isDue).length
  return v + h
}
