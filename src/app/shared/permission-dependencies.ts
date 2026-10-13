// ============================================================
//  permission-dependencies.ts  –  Cross-module "auxiliary list"
//  dependencies for permission keys.
//
//  Many screens populate filter dropdowns / reference data by
//  calling OTHER modules' own list endpoints (e.g. the Batch list
//  screen's Program/Center filters call ims/program/list and
//  ims/center/list, each gated server-side by orgProgram:list /
//  orgCenter:list). A user granted only the primary action key
//  (e.g. batch:promote) but not those auxiliary keys will have
//  that action silently break — the dropdown/lookup 403s even
//  though the button itself is visible.
//
//  This map lets the User Create/Edit and Manage Access screens
//  auto-check those auxiliary keys whenever a primary key is
//  checked, so admins don't have to know this wiring by heart.
//  Every entry here was verified against the actual
//  commonApi.fetchData(...) calls in the corresponding component,
//  not guessed from UI labels — see chat history for the audit.
//
//  Unchecking a primary key does NOT auto-remove its dependencies
//  (they may be required by something else already granted).
// ============================================================

export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  // ---------------- Batch ----------------
  'batch:list': ['orgProgram:list', 'orgCenter:list'],
  'batch:edit': ['orgProgram:list', 'orgCenter:list'],
  'batch:promote': ['orgProgram:list'],
  'batch:addSpecialClass': ['orgStaff:list', 'phase:list'],
  'batch:assignFaculty': ['orgStaff:list'],
  'batch:shuffleStudents': ['batch:list'],

  // ---------------- Org Masters ----------------
  'orgStaff:create': ['orgCenter:list', 'orgDept:list', 'orgSubject:list'],
  'orgStaff:edit': ['orgCenter:list', 'orgDept:list', 'orgSubject:list'],
  'orgProgram:create': ['orgSubject:list'],
  'orgProgram:edit': ['orgSubject:list'],
  'orgProgram:addSubjects': ['orgSubject:list'],
  'orgProgram:removeSubjects': ['orgSubject:list'],
  'orgProgram:examMapping': ['orgSubject:list', 'orgExamCategory:list'],
  'orgTopic:create': ['orgSubject:list'],
  'orgTopic:edit': ['orgSubject:list'],
  'orgSubTopic:create': ['orgSubject:list', 'orgTopic:list'],
  'orgSubTopic:edit': ['orgSubject:list', 'orgTopic:list'],
  'orgExamCategory:addSubCategories': ['orgExamCategory:list'],
  'orgSchoolExam:list': ['batch:list', 'orgCenter:list', 'orgSubject:list'],

  // ---------------- Student ----------------
  'student:list': ['orgProgram:list', 'orgCenter:list'],

  // ---------------- Assignment Test ----------------
  'test:list': ['orgSubject:list', 'orgTopic:list', 'orgSubTopic:list'],
  'test:edit': ['orgSubject:list', 'orgTopic:list', 'orgSubTopic:list', 'orgExamCategory:list'],

  // ---------------- Enable Assignment ----------------
  // Confirmed bug source: enableTopic()/confirmDisable() internally hit the
  // same endpoints that back enableAssignment:list / :viewTests before ever
  // calling enableto/batch or disableto/batch — without these, Enable/Disable
  // silently fails even though the button is visible.
  'enableAssignment:list': ['orgSubject:list', 'batch:list'],
  'assignmentBatch:list': ['enableAssignment:list'],
  'assignmentBatch:assign': ['orgSubject:list', 'batch:list', 'enableAssignment:list'],
  'assignmentBatch:unassign': ['orgSubject:list', 'batch:list', 'enableAssignment:viewTests'],

  // ---------------- Phase Plan ----------------
  'phase:list': ['orgProgram:list', 'orgSubject:list'],
  'phase:create': ['orgProgram:list', 'orgSubject:list'],
  'phase:edit': ['orgProgram:list', 'orgSubject:list'],

  // ---------------- Activity ----------------
  'activity:list': ['orgCenter:list', 'batch:list'],
  'activity:create': ['orgCenter:list', 'batch:list'],
  'activity:edit': ['orgCenter:list', 'batch:list'],

  // ---------------- Performance ----------------
  'performance:list': ['batch:list'],

  // ---------------- Task ----------------
  'task:create': ['orgUser:list'],
  'task:edit': ['orgUser:list'],

  // ---------------- PTM ----------------
  'ptm:list': ['batch:list'],
  'ptm:create': ['batch:list', 'orgProgram:list', 'orgCenter:list', 'student:list'],

  // ---------------- Library (Knowledge) ----------------
  'knowledge:list': ['orgSubject:list', 'batch:list'],
  'knowledge:create': ['orgSubject:list', 'orgTopic:list', 'orgSubTopic:list', 'batch:list', 'student:list'],
  'knowledge:edit': ['orgSubject:list', 'orgTopic:list', 'orgSubTopic:list', 'batch:list', 'student:list'],
  'knowledge:view': ['batch:list', 'student:list'],

  // ---------------- Study Material (Package) ----------------
  'package:create': ['orgSubject:list'],
  'package:edit': ['orgSubject:list'],
  'package:enable': ['batch:list'],
  'package:disable': ['batch:list'],

  // ---------------- Circular ----------------
  'circular:list': ['batch:list', 'orgCenter:list'],

  // ---------------- Reports ----------------
  'reports:view': [
    'orgProgram:list',
    'orgCenter:list',
    'orgSubject:list',
    'batch:list',
    'student:list',
    'orgStaff:list',
    'orgTopic:list',
  ],

  // ---------------- Communication ----------------
  'communication:create': ['batch:list', 'student:list', 'communicationTemplate:list'],
  'communication:send': ['batch:list', 'student:list', 'communicationTemplate:list'],
  'communicationEvent:create': ['communicationTemplate:list'],
  'communicationEvent:edit': ['communicationTemplate:list'],

  // ---------------- Support ----------------
  'support:assignStaff': ['orgStaff:list'],

  // ---------------- Exams ----------------
  'examContent:list': ['orgSubject:list'],
  'examContent:create': ['orgSubject:list'],
  'examContent:edit': ['orgSubject:list'],
  'exam:view': ['orgSubject:list', 'orgTopic:list', 'orgSubTopic:list'],
  'exam:addQuestion': ['orgSubject:list', 'orgTopic:list', 'orgSubTopic:list'],
  'exam:create': ['examContent:list', 'orgSubject:list'],
  'exam:edit': ['examContent:list', 'orgSubject:list'],
};

/** Resolves the full transitive closure of dependencies for a set of checked keys. */
export function resolveDependencies(keys: string[]): Set<string> {
  const resolved = new Set<string>();
  const stack = [...keys];
  while (stack.length) {
    const key = stack.pop();
    if (!key) continue;
    const deps = PERMISSION_DEPENDENCIES[key];
    if (!deps) continue;
    for (const dep of deps) {
      if (!resolved.has(dep)) {
        resolved.add(dep);
        stack.push(dep);
      }
    }
  }
  return resolved;
}
