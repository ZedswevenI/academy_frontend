// ============================================================
//  permission-catalog.data.ts  –  Local mirror of the permission
//  catalog (265 keys / 49 modules). Used to render the permission
//  picker in Org Masters → Users until POST /ims/permission/catalog
//  is wired up — same shape as that endpoint's response, so
//  swapping the source later is a one-line change in the
//  component, not a rewrite of the UI.
// ============================================================

export interface PermissionEntry {
  permissionKey: string;
  action: string;
  label: string;
}

export interface PermissionModuleGroup {
  module: string;
  moduleLabel: string;
  permissions: PermissionEntry[];
}

// Flat key list — verbatim from the access-control spec (265 keys / 49 modules).
const RAW_PERMISSION_KEYS: string[] = [
  'accounts:addPayment', 'accounts:chequeExtension', 'accounts:chequeReplacement', 'accounts:depositBatch',
  'accounts:listCheques', 'accounts:listNeft', 'accounts:listPayments', 'accounts:reconcileCheque', 'accounts:updateNeftStatus',
  'activity:create', 'activity:delete', 'activity:edit', 'activity:export', 'activity:list', 'activity:view',
  'admission:approve', 'admission:bulkUpload', 'admission:create', 'admission:export', 'admission:list',
  'admission:reject', 'admission:review', 'admission:submitForApproval', 'admission:update', 'admission:view',
  'assignmentBatch:assign', 'assignmentBatch:list', 'assignmentBatch:unassign', 'assignmentBatch:view',
  'attendance:edit', 'attendance:export', 'attendance:list', 'attendance:mark', 'attendance:report',
  'batch:addSpecialClass', 'batch:assignFaculty', 'batch:assignStudents', 'batch:close', 'batch:create',
  'batch:delete', 'batch:edit', 'batch:list', 'batch:logLateEntry', 'batch:promote', 'batch:view',
  'chat:list', 'chat:search', 'chat:send',
  'circular:create', 'circular:delete', 'circular:edit', 'circular:list', 'circular:publish', 'circular:view',
  'class:list', 'class:view',
  'communication:create', 'communication:previewRecipients', 'communication:send',
  'communicationBulkMail:reset', 'communicationBulkMail:send',
  'communicationEvent:create', 'communicationEvent:delete', 'communicationEvent:edit', 'communicationEvent:list',
  'communicationLog:list', 'communicationLog:retry', 'communicationLog:view',
  'communicationTemplate:create', 'communicationTemplate:delete', 'communicationTemplate:edit', 'communicationTemplate:list',
  'dashboard:view',
  'enableAssignment:disableTopic', 'enableAssignment:enableTopic', 'enableAssignment:list',
  'enableAssignment:resetAll', 'enableAssignment:viewTests',
  'exam:addQuestion', 'exam:assignBatch', 'exam:create', 'exam:delete', 'exam:disable', 'exam:duplicate',
  'exam:edit', 'exam:enable', 'exam:graceMarks', 'exam:importAnswers', 'exam:importQuestions', 'exam:list',
  'exam:marksImport', 'exam:offlineMarksEntry', 'exam:publish', 'exam:publishResult', 'exam:rearrangeQuestions',
  'exam:reevaluate', 'exam:view',
  'examContent:create', 'examContent:delete', 'examContent:edit', 'examContent:list', 'examContent:view',
  'examImport:delete', 'examImport:list', 'examImport:view',
  'feedback:changeStatus', 'feedback:consolidatedReport', 'feedback:create', 'feedback:delete', 'feedback:edit',
  'feedback:list', 'feedback:viewResults',
  'feedbackTemplate:create', 'feedbackTemplate:delete', 'feedbackTemplate:edit', 'feedbackTemplate:export',
  'feedbackTemplate:list', 'feedbackTemplate:toggleStatus',
  'invigilation:create', 'invigilation:delete', 'invigilation:edit', 'invigilation:list', 'invigilation:print', 'invigilation:view',
  'inward:create', 'inward:delete', 'inward:edit', 'inward:list', 'inward:view',
  'knowledge:create', 'knowledge:delete', 'knowledge:edit', 'knowledge:list', 'knowledge:view',
  'notification:list', 'notification:markAllRead', 'notification:markRead', 'notification:remove',
  'orgBankAccount:create', 'orgBankAccount:delete', 'orgBankAccount:edit', 'orgBankAccount:list',
  'orgCenter:create', 'orgCenter:delete', 'orgCenter:edit', 'orgCenter:list', 'orgCenter:view',
  'orgDept:create', 'orgDept:delete', 'orgDept:edit', 'orgDept:list',
  'orgExamCategory:addSubCategories', 'orgExamCategory:create', 'orgExamCategory:delete', 'orgExamCategory:edit', 'orgExamCategory:list',
  'orgHelpCenter:create', 'orgHelpCenter:delete', 'orgHelpCenter:edit', 'orgHelpCenter:list',
  'orgProgram:addSubjects', 'orgProgram:create', 'orgProgram:delete', 'orgProgram:edit', 'orgProgram:examMapping',
  'orgProgram:list', 'orgProgram:removeSubjects', 'orgProgram:view',
  'orgSchoolExam:create', 'orgSchoolExam:delete', 'orgSchoolExam:edit', 'orgSchoolExam:list',
  'orgStaff:create', 'orgStaff:delete', 'orgStaff:edit', 'orgStaff:list', 'orgStaff:view',
  'orgSubTopic:create', 'orgSubTopic:delete', 'orgSubTopic:edit', 'orgSubTopic:list',
  'orgSubject:create', 'orgSubject:delete', 'orgSubject:edit', 'orgSubject:list',
  'orgTopic:addSubTopics', 'orgTopic:create', 'orgTopic:delete', 'orgTopic:edit', 'orgTopic:list',
  'orgUser:assignAccess', 'orgUser:create', 'orgUser:delete', 'orgUser:edit', 'orgUser:list', 'orgUser:view',
  'package:create', 'package:delete', 'package:disable', 'package:edit', 'package:enable', 'package:list', 'package:view',
  'performance:list', 'performance:override', 'performance:sync', 'performance:view',
  'phase:create', 'phase:delete', 'phase:edit', 'phase:list', 'phase:view',
  'ptm:create', 'ptm:delete', 'ptm:edit', 'ptm:list', 'ptm:view',
  'reports:export', 'reports:view',
  'schoolAttendance:declareHoliday', 'schoolAttendance:export', 'schoolAttendance:finalise', 'schoolAttendance:list',
  'schoolAttendance:mark', 'schoolAttendance:print', 'schoolAttendance:removeHoliday', 'schoolAttendance:submit',
  'schoolAttendance:toggleStudent',
  'student:alumniImport', 'student:boardImport', 'student:bulkUpload', 'student:create', 'student:edit',
  'student:export', 'student:imageUpload', 'student:list', 'student:rpaImport', 'student:view',
  'support:assignStaff', 'support:list', 'support:updatePriority', 'support:updateStatus', 'support:view',
  'task:create', 'task:edit', 'task:list', 'task:view',
  'teacher:list', 'teacher:view',
  'test:addQuestion', 'test:create', 'test:delete', 'test:edit', 'test:importQuestions', 'test:list',
  'test:rearrangeQuestions', 'test:report', 'test:view',
  'timetable:create', 'timetable:edit', 'timetable:export', 'timetable:list', 'timetable:publish',
  'timetable:revertDraft', 'timetable:view',
];

// Human labels for modules whose auto-generated split (camelCase → words) would
// read badly (acronyms, compound org-master names). Anything not listed here
// falls through to the generic splitter below.
const MODULE_LABEL_OVERRIDES: Record<string, string> = {
  orgBankAccount: 'Org Masters - Bank Account',
  orgCenter: 'Org Masters - Center',
  orgDept: 'Org Masters - Department',
  orgExamCategory: 'Org Masters - Exam Category',
  orgHelpCenter: 'Org Masters - Help Center',
  orgProgram: 'Org Masters - Program',
  orgSchoolExam: 'Org Masters - School Exam',
  orgStaff: 'Org Masters - Staff',
  orgSubTopic: 'Org Masters - Sub-Topic',
  orgSubject: 'Org Masters - Subject',
  orgTopic: 'Org Masters - Topic',
  orgUser: 'Org Masters - Users',
  ptm: 'PTM',
  schoolAttendance: 'School Attendance',
};

function splitCamel(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function moduleLabel(mod: string): string {
  return MODULE_LABEL_OVERRIDES[mod] || splitCamel(mod);
}

function actionLabel(mod: string, action: string, key: string): PermissionEntry {
  return {
    permissionKey: key,
    action,
    label: `${moduleLabel(mod)} - ${splitCamel(action)}`,
  };
}

function buildCatalog(keys: string[]): PermissionModuleGroup[] {
  const byModule = new Map<string, PermissionEntry[]>();
  for (const key of keys) {
    const [mod, action] = key.split(':');
    if (!mod || !action) continue;
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(actionLabel(mod, action, key));
  }
  return Array.from(byModule.entries())
    .map(([module, permissions]) => ({ module, moduleLabel: moduleLabel(module), permissions }))
    .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
}

/** Grouped catalog — same shape as `POST /ims/permission/catalog`'s `data` array. */
export const PERMISSION_CATALOG: PermissionModuleGroup[] = buildCatalog(RAW_PERMISSION_KEYS);

/** All 265 keys flattened, for quick validation/lookup. */
export const ALL_PERMISSION_KEYS: string[] = RAW_PERMISSION_KEYS.slice();

export function isKnownPermissionKey(key: string): boolean {
  return ALL_PERMISSION_KEYS.includes(key);
}
