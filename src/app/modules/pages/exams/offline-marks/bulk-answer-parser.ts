/**
 * Bulk offline-import answer parser.
 *
 * Converts one Excel cell's raw text into the exact `answerRaw` shape the
 * submit-offline / submit-offline/bulk endpoints expect, validated against
 * the REAL question data for this exam (option keys, left/right matrix
 * keys, correct-option count for passage_qns) — never guessed from the
 * cell content alone.
 *
 * Framework-free (no Angular imports) so it stays independently testable.
 */

export interface BulkQuestionOption {
  key: string;
  isCorrect: boolean;
}

export interface BulkQuestionColumnKey {
  key: string;
}

export interface BulkQuestion {
  questionId: string;
  questionNo: string;
  questionType: string;
  questionOptions?: BulkQuestionOption[];
  leftColumn?: BulkQuestionColumnKey[];
  rightColumn?: BulkQuestionColumnKey[];
}

export interface AnswerEntry {
  questionId: string;
  answerRaw: string | number | boolean | null;
  isSkipped: boolean;
}

export type CellParseResult =
  | { ok: true; entry: AnswerEntry }
  | { ok: false; error: string };

// ── Small shared helpers ─────────────────────────────────────────────────

/** Treats '', null, undefined, and the literal word SKIP as "left blank". */
function isBlankCell(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  const s = String(raw).trim();
  return s === '' || s.toUpperCase() === 'SKIP';
}

function skipped(questionId: string): AnswerEntry {
  return { questionId, answerRaw: null, isSkipped: true };
}

/** Splits an option-key list cell on ';' or ',' — both accepted, never mixed silently. */
function splitKeyList(raw: string): string[] {
  const sep = raw.includes(';') ? ';' : raw.includes(',') ? ',' : null;
  const parts = sep ? raw.split(sep) : [raw];
  return parts.map((p) => p.trim().toUpperCase()).filter((p) => p.length > 0);
}

function optionKeySet(q: BulkQuestion): Set<string> {
  return new Set((q.questionOptions || []).map((o) => o.key.toUpperCase()));
}

// ── Per-type parsers ─────────────────────────────────────────────────────

function parseMcqSingle(q: BulkQuestion, raw: string): CellParseResult {
  const keys = splitKeyList(raw);
  if (keys.length !== 1) {
    return {
      ok: false,
      error: `${q.questionNo}: expected exactly one option key, got "${raw}"`,
    };
  }
  const valid = optionKeySet(q);
  const key = keys[0];
  if (!valid.has(key)) {
    return {
      ok: false,
      error: `${q.questionNo}: "${key}" is not a valid option (expected one of ${[...valid].join(', ')})`,
    };
  }
  return { ok: true, entry: { questionId: q.questionId, answerRaw: key, isSkipped: false } };
}

function parseMcqMulti(q: BulkQuestion, raw: string): CellParseResult {
  const keys = splitKeyList(raw);
  if (!keys.length) {
    return { ok: false, error: `${q.questionNo}: no option keys found in "${raw}"` };
  }
  const valid = optionKeySet(q);
  const unknown = keys.filter((k) => !valid.has(k));
  if (unknown.length) {
    return {
      ok: false,
      error: `${q.questionNo}: unknown option key(s) ${unknown.join(', ')} (expected some of ${[...valid].join(', ')})`,
    };
  }
  const deduped = [...new Set(keys)].sort();
  return {
    ok: true,
    entry: { questionId: q.questionId, answerRaw: deduped.join(';'), isSkipped: false },
  };
}

/**
 * passage_qns behaves like mcq_single or mcq_multi depending on how many
 * options THIS question actually marks correct — never inferred from what
 * the student typed, so a student who (incorrectly) enters two keys for a
 * single-answer passage question is still flagged as an error rather than
 * silently accepted as if it were multi-answer.
 *
 * A passage_qns question with NO options at all (empty questionOptions)
 * is a free-text passage question (e.g. "Define oxidation reaction."),
 * not an MCQ — without this check every cell for such a question would
 * fail as "not a valid option" since there'd be zero valid keys to match.
 */
function parsePassageQns(q: BulkQuestion, raw: string): CellParseResult {
  if (!(q.questionOptions || []).length) {
    return parseFreeText(q, raw);
  }
  const correctCount = (q.questionOptions || []).filter((o) => o.isCorrect).length;
  return correctCount > 1 ? parseMcqMulti(q, raw) : parseMcqSingle(q, raw);
}

function parseTrueFalse(q: BulkQuestion, raw: string): CellParseResult {
  const v = raw.trim().toLowerCase();
  if (v !== 'true' && v !== 'false') {
    return { ok: false, error: `${q.questionNo}: expected true/false, got "${raw}"` };
  }
  return { ok: true, entry: { questionId: q.questionId, answerRaw: v === 'true', isSkipped: false } };
}

function parseNumeric(q: BulkQuestion, raw: string): CellParseResult {
  const n = Number(raw.trim());
  if (Number.isNaN(n)) {
    return { ok: false, error: `${q.questionNo}: "${raw}" is not a valid number` };
  }
  return { ok: true, entry: { questionId: q.questionId, answerRaw: n, isSkipped: false } };
}

function parseInteger(q: BulkQuestion, raw: string): CellParseResult {
  const n = Number(raw.trim());
  if (!Number.isInteger(n)) {
    return { ok: false, error: `${q.questionNo}: "${raw}" is not a whole number` };
  }
  return { ok: true, entry: { questionId: q.questionId, answerRaw: n, isSkipped: false } };
}

function parseFreeText(q: BulkQuestion, raw: string): CellParseResult {
  return { ok: true, entry: { questionId: q.questionId, answerRaw: raw.trim(), isSkipped: false } };
}

/**
 * Matrix cell format: "LeftKey:RightKeys;LeftKey:RightKeys;..."
 * RightKeys may be written concatenated ("PQ") or comma-separated ("P,Q")
 * — both accepted since every left/right key in this app's matrix
 * questions is always a single uppercase letter (A, B, C… / P, Q, R…),
 * so splitting a concatenated run of letters is unambiguous.
 */
function parseMatrix(q: BulkQuestion, raw: string): CellParseResult {
  const leftKeys = new Set((q.leftColumn || []).map((c) => c.key.toUpperCase()));
  const rightKeys = new Set((q.rightColumn || []).map((c) => c.key.toUpperCase()));

  const pairs = raw
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!pairs.length) {
    return { ok: false, error: `${q.questionNo}: no left:right pairs found in "${raw}"` };
  }

  const seenLeft = new Set<string>();
  const built: string[] = [];

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) {
      return {
        ok: false,
        error: `${q.questionNo}: pair "${pair}" is missing ":" (expected format LeftKey:RightKeys)`,
      };
    }
    const left = pair.slice(0, colonIdx).trim().toUpperCase();
    const rightRaw = pair.slice(colonIdx + 1).trim().toUpperCase();

    if (!left || !rightRaw) {
      return { ok: false, error: `${q.questionNo}: pair "${pair}" has an empty left or right side` };
    }
    if (!leftKeys.has(left)) {
      return {
        ok: false,
        error: `${q.questionNo}: "${left}" is not a valid left-column key (expected one of ${[...leftKeys].join(', ')})`,
      };
    }
    if (seenLeft.has(left)) {
      return {
        ok: false,
        error: `${q.questionNo}: left key "${left}" appears more than once — combine its matches into a single "${left}:...." pair instead`,
      };
    }
    seenLeft.add(left);

    const rightList = rightRaw.includes(',')
      ? rightRaw.split(',').map((r) => r.trim())
      : rightRaw.split('');
    const unknownRight = rightList.filter((r) => !rightKeys.has(r));
    if (unknownRight.length) {
      return {
        ok: false,
        error: `${q.questionNo}: "${unknownRight.join(', ')}" is not a valid right-column key for left key "${left}" (expected some of ${[...rightKeys].join(', ')})`,
      };
    }

    built.push(`${left}:${rightList.join('')}`);
  }

  return {
    ok: true,
    entry: { questionId: q.questionId, answerRaw: built.join(';'), isSkipped: false },
  };
}

// ── Entry point: one cell → one AnswerEntry ──────────────────────────────

export function parseAnswerCell(q: BulkQuestion, rawCellValue: unknown): CellParseResult {
  if (isBlankCell(rawCellValue)) {
    return { ok: true, entry: skipped(q.questionId) };
  }
  const raw = String(rawCellValue).trim();

  switch (q.questionType) {
    case 'mcq_single':
      return parseMcqSingle(q, raw);
    case 'mcq_multi':
      return parseMcqMulti(q, raw);
    case 'passage_qns':
      return parsePassageQns(q, raw);
    case 'true_false':
      return parseTrueFalse(q, raw);
    case 'numeric':
      return parseNumeric(q, raw);
    case 'integer':
      return parseInteger(q, raw);
    case 'matrix':
      return parseMatrix(q, raw);
    case 'short_answer':
    case 'subjective':
      return parseFreeText(q, raw);
    default:
      return { ok: false, error: `${q.questionNo}: unsupported question type "${q.questionType}"` };
  }
}

// ── Entry point: one Excel row → the full answers[] array (or errors) ───

export interface RowParseResult {
  ok: boolean;
  answers: AnswerEntry[];
  errors: string[]; // one message per invalid cell in this row, all collected (not fail-fast)
}

/**
 * `row` is a map of question column header -> raw cell value.
 * `columnToQuestion` maps each of those same headers to the matching
 * BulkQuestion, built once per exam when the uploaded sheet's headers are
 * matched back to the exam's real question list.
 */
export function parseStudentRow(
  row: Record<string, unknown>,
  columnToQuestion: Map<string, BulkQuestion>,
): RowParseResult {
  const answers: AnswerEntry[] = [];
  const errors: string[] = [];

  columnToQuestion.forEach((question, column) => {
    const result = parseAnswerCell(question, row[column]);
    if (result.ok) {
      answers.push(result.entry);
    } else {
      errors.push(result.error);
    }
  });

  return { ok: errors.length === 0, answers, errors };
}

/**
 * Extracts the questionNo embedded at the end of a template column header,
 * e.g. "Q3 (QPHY00102)" -> "QPHY00102". Returns null if the header doesn't
 * match that shape (used to skip unrelated columns like Admission No).
 */
export function extractQuestionNoFromHeader(header: string): string | null {
  const match = header.match(/\(([^()]+)\)\s*$/);
  return match ? match[1].trim() : null;
}
