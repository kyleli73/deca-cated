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
 * - Right: moves up one box, but only once per calendar day, so it has to be
 *   right on MASTERY_DAYS different days before it's mastered.
 * - Right with no card (never missed): nothing to track.
 */
export function applyResult(
  card: ReviewCard | undefined,
  questionId: string,
  chosen: Letter,
  correct: boolean,
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
      lastWrongAt: now,
      lastWrongChoice: chosen,
      mastered: false,
    };
  }
  if (!card || card.mastered || card.lastCorrectDay === day) return card;
  const box = card.box + 1;
  if (box >= MASTERY_DAYS) return { ...card, box, lastCorrectDay: day, mastered: true };
  return { ...card, box, lastCorrectDay: day, due: addDays(day, REVIEW_GAPS[box - 1]) };
}

export function isDue(card: ReviewCard, today: string): boolean {
  return !card.mastered && card.due <= today;
}
