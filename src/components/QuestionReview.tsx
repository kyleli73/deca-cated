import type { ReactNode } from 'react';
import { areaName } from '../lib/areas.ts';
import { LETTERS, type Letter, type Question } from '../lib/types.ts';

/** A question with the correct answer and your answer marked, plus the explanation. */
export function QuestionReview({
  number,
  question,
  chosen,
  chosenLabel = 'Your answer',
  showResult = true,
  footer,
}: {
  number: number;
  question: Question;
  chosen: Letter | null;
  chosenLabel?: string;
  showResult?: boolean;
  footer?: ReactNode;
}) {
  const right = chosen === question.answer;
  return (
    <article className="review-item">
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="muted small num">Question {number}</span>
        <span className="spacer" />
        {!showResult ? null : chosen === null ? (
          <span className="status-pill muted">Not answered</span>
        ) : right ? (
          <span className="status-pill good">✓ Correct</span>
        ) : (
          <span className="status-pill bad">✗ Wrong</span>
        )}
      </div>
      <div className="review-stem">{question.stem}</div>
      <div className="review-options">
        {question.options.map((o, i) => {
          const letter = LETTERS[i];
          const isAnswer = letter === question.answer;
          const isChosenWrong = letter === chosen && !isAnswer;
          return (
            <div key={letter} className={`review-opt${isAnswer ? ' correct' : isChosenWrong ? ' wrong' : ''}`}>
              <span className="l">{letter}</span>
              <span>{o}</span>
              {isAnswer && <span className="mark">✓ Correct answer{letter === chosen ? ' · yours' : ''}</span>}
              {isChosenWrong && <span className="mark">✗ {chosenLabel}</span>}
            </div>
          );
        })}
      </div>
      {question.explanation && <div className="explanation">{question.explanation}</div>}
      <div className="meta-line">
        {question.piCode && (
          <span>
            {question.piCode} · {areaName(question.area)}
            {question.piTitle && ` · ${question.piTitle}`}
          </span>
        )}
        {question.source && <span>Source: {question.source}</span>}
      </div>
      {footer && <div className="meta-line" style={{ marginTop: 8 }}>{footer}</div>}
    </article>
  );
}
