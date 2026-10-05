import { addDays } from './time.ts';
import type { Letter, ReviewCard } from './types.ts';

/** A mistake counts as learned after correct answers on this many different days. */
export const MASTERY_DAYS = 3;
/** Days until the card is due again after the 1st and 2nd correct day. */
export const REVIEW_GAPS = [1, 3];

/**
 * Update a question's spaced-repetition card after it was answered.
 *
 * - Wrong: the card (re)starts at box 0 and is due today.
 * - Right but guessed: a lucky guess isn't knowledge. A card is created (or
 *   un-mastered) so the question comes back, and it doesn't move up a box.
 * - Right and sure: moves up one box, but only once per calendar day, so it
 *   has to be right on MASTERY_DAYS different days before it's mastered.
 * - Right and sure with no card (never missed or guessed): nothing to track.
 */
export function applyResult(
  card: ReviewCard | undefined,
  questionId: string,
  chosen: Letter,
  correct: boolean,
  guessed: boolean,
  day: string,
  now: number,
): ReviewCard | undefined {
  if (!correct) {
    return {
      questionId,
      box: 0,
      due: day,
      lastCorrectDay: null,
      wrongCount: (card?.wrongCount ?? 0) + 1,
      guessCount: card?.guessCount ?? 0,
      lastWrongAt: now,
      lastWrongChoice: chosen,
      mastered: false,
    };
  }
  if (guessed) {
    if (!card) {
      return { questionId, box: 0, due: day, lastCorrectDay: null, wrongCount: 0, guessCount: 1, lastWrongAt: now, lastWrongChoice: null, mastered: false };
    }
    const guessCount = (card.guessCount ?? 0) + 1;
    if (card.mastered) return { ...card, guessCount, lastWrongAt: now, mastered: false, box: MASTERY_DAYS - 1, due: day };
    return { ...card, guessCount, lastWrongAt: now };
  }
  if (!card || card.mastered || card.lastCorrectDay === day) return card;
  const box = card.box + 1;
  if (box >= MASTERY_DAYS) return { ...card, box, lastCorrectDay: day, mastered: true };
  return { ...card, box, lastCorrectDay: day, due: addDays(day, REVIEW_GAPS[box - 1]) };
}

export function isDue(card: ReviewCard, today: string): boolean {
  return !card.mastered && card.due <= today;
}
