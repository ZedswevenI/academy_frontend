// Print ordering for exam questions: group by subject priority, then by
// question-type priority within each subject, then by the question's own
// manually-set sortOrder as the final tiebreaker.

const SUBJECT_PRIORITY = [
  'physics',
  'chemistry',
  'maths',
  'biology',
  'mental ability',
  'botany',
  'zoology',
];

// mcq_single -> Single Correct, mcq_multi -> Multi Correct, integer -> Integer Type,
// numeric -> Numerical, passage_qns -> Comprehension Type, matrix -> Matrix Match
// (with-list / without-list are not distinguishable in the data model, so both
// collapse into the same 'matrix' priority slot).
const QUESTION_TYPE_PRIORITY: Record<string, number> = {
  mcq_single: 1,
  mcq_multi: 2,
  integer: 3,
  numeric: 4,
  passage_qns: 5,
  matrix: 6,
};
const UNLISTED_TYPE_RANK = Object.keys(QUESTION_TYPE_PRIORITY).length + 1;

export function subjectPrintRank(subjectName: string): number {
  const idx = SUBJECT_PRIORITY.indexOf(
    (subjectName || '').trim().toLowerCase(),
  );
  return idx === -1 ? SUBJECT_PRIORITY.length : idx;
}

export function questionTypePrintRank(questionType: string): number {
  return QUESTION_TYPE_PRIORITY[questionType] ?? UNLISTED_TYPE_RANK;
}

/**
 * Sorts questions for print: subject priority first, then question-type
 * priority within that subject, then the question's own sortOrder.
 * `subjectNameFor` resolves a question to its subject name (e.g. via its
 * section's sectionName/subjectId).
 */
export function sortQuestionsForPrint<T extends { questionType: string; sortOrder?: number }>(
  questions: T[],
  subjectNameFor: (q: T) => string,
): T[] {
  return [...questions].sort((a, b) => {
    const subjectDiff =
      subjectPrintRank(subjectNameFor(a)) - subjectPrintRank(subjectNameFor(b));
    if (subjectDiff !== 0) return subjectDiff;
    const typeDiff =
      questionTypePrintRank(a.questionType) - questionTypePrintRank(b.questionType);
    if (typeDiff !== 0) return typeDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}
