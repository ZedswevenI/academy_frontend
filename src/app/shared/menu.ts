export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  /**
   * Permission key(s) that gate this item — checked as "any of" when an
   * array. Leaf items with no `permission` are hidden by default (deny by
   * default, matches PermissionService's isAdmin-bypass-only design).
   * Parent items with `children` don't need their own `permission` — they're
   * shown/hidden purely based on whether any child survives filtering.
   */
  permission?: string | string[];
  children?: MenuItem[];
  expanded?: boolean;
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'fa-solid fa-gauge',
    route: '/app/dashboard',
    permission: 'dashboard:view'
  },
  {
    label: 'Batch',
    icon: 'fa-solid fa-layer-group',
    route: '/app/batch',
    permission: 'batch:list'
  },
  {
    label: 'Timetable',
    icon: 'fa-solid fa-calendar-days',
    route: '/app/timetable',
    permission: 'timetable:list'
  },
  {
    label: 'Attendance',
    icon: 'fa-solid fa-clipboard-check',
    route: '/app/attendance',
    permission: 'attendance:list'
  },
  {
    label: 'School Attendance',
    icon: 'fa-solid fa-clipboard-check',
    route: '/app/school-attendance',
    permission: 'schoolAttendance:list'
  },
  {
    label: 'Students',
    icon: 'fa-solid fa-user-graduate',
    route: '/app/student',
    permission: 'student:list'
  },
  {
    label: 'Teachers',
    icon: 'fa-solid fa-chalkboard-user',
    route: '/app/teacher',
    permission: 'teacher:list'
  },
  {
    label: 'Assignments',
    icon: 'fa-solid fa-file-pen',
    route: '/app/assignment',
    permission: 'test:list'
  },
  {
    label: 'Enable Assignment',
    icon: 'fa-solid fa-file-circle-check',
    route: '/app/enableassignment',
    permission: 'enableAssignment:list'
  },
  {
    label: 'Phase Plan',
    icon: 'fa-solid fa-hourglass-half',
    route: '/app/phase',
    permission: 'phase:list'
  },
  {
    label: 'Activities',
    icon: 'fa-solid fa-list-check',
    route: '/app/activity',
    permission: 'activity:list'
  },
  {
    label: 'Student Performance',
    icon: 'fa-solid fa-chart-column',
    route: '/app/performance',
    permission: 'performance:list'
  },
  {
    label: 'Tasks',
    icon: 'fa-solid fa-list-check',
    route: '/app/task',
    permission: 'task:list'
  },
  {
    label: 'PTM',
    icon: 'fa-solid fa-people-group',
    route: '/app/ptm',
    permission: 'ptm:list'
  },
  {
    label: 'Library',
    icon: 'fa-solid fa-book-open',
    route: '/app/knowledge',
    permission: 'knowledge:list'
  },
  {
    label: 'Study Material',
    icon: 'fa-solid fa-box-open',
    route: '/app/package',
    permission: 'package:list'
  },
  {
    label: 'Circular',
    icon: 'fa-solid fa-bullhorn',
    route: '/app/circular',
    permission: 'circular:list'
  },
  {
    label: 'Feedback',
    icon: 'fa-solid fa-award',
    children: [
      {
        label: 'Feedback',
        icon: 'fa-solid fa-commenting',
        route: '/app/feedback',
        permission: 'feedback:list'
      },
      {
        label: 'Templates',
        icon: 'fa-solid fa-newspaper',
        route: '/app/feedback/feedback/template',
        permission: 'feedbackTemplate:list'
      },
      {
        label: 'Report',
        icon: 'fa-solid fa-table-list',
        route: '/app/feedback/consolidated-report',
        permission: 'feedback:consolidatedReport'
      }
    ]
  },
  {
    label: 'Reports',
    icon: 'fa-solid fa-chart-line',
    route: '/app/report',
    permission: 'reports:view'
  },
  {
    label: 'Invigilation',
    icon: 'fa-solid fa-person-chalkboard',
    route: '/app/invigilation',
    permission: 'invigilation:list'
  },
  {
    label: 'Communication',
    icon: 'fa-solid fa-envelope-open-text',
    children: [
      {
        label: 'Send',
        icon: 'fa-solid fa-paper-plane',
        route: '/app/communication/send',
        permission: 'communication:create'
      },
      {
        label: 'Templates',
        icon: 'fa-solid fa-file-lines',
        route: '/app/communication/templates',
        permission: 'communicationTemplate:list'
      },
      {
        label: 'Event Mapping',
        icon: 'fa-solid fa-file-lines',
        route: '/app/communication/event-mapping',
        permission: 'communicationEvent:list'
      },
      {
        label: 'Send Bulk Email',
        icon: 'fa-solid fa-file-lines',
        route: '/app/communication/send-bulk',
        permission: 'communicationBulkMail:send'
      },
      {
        label: 'Sent Logs',
        icon: 'fa-solid fa-clock-rotate-left',
        route: '/app/communication/sent-logs',
        permission: 'communicationLog:list'
      }
    ]
  },
  {
    label: 'Support',
    icon: 'fa-solid fa-headset',
    route: '/app/support',
    permission: 'support:list'
  },
  {
    label: 'Exams',
    icon: 'fa-solid fa-file-circle-question',
    children: [
      {
        label: 'Instructions',
        icon: 'fa-solid fa-clipboard-list',
        route: '/app/exams/instructions',
        permission: 'examContent:list'
      },
      {
        label: 'Passage',
        icon: 'fa-solid fa-book-open-reader',
        route: '/app/exams/passage',
        permission: 'examContent:list'
      },
      {
        label: 'Questions',
        icon: 'fa-solid fa-circle-question',
        route: '/app/exams/questions',
        permission: 'examContent:list'
      },
      {
        label: 'Exams',
        icon: 'fa-solid fa-file-pen',
        route: '/app/exams/exams',
        permission: 'exam:list'
      },
      {
        label: 'Imported Exams',
        icon: 'fa-solid fa-file-import',
        route: '/app/exams/imported-exams',
        permission: 'examImport:list'
      }
    ]
  },
  {
    label: 'School Exams',
    icon: 'fa-solid fa-chalkboard-user',
    route: '/app/org-master/school/exams',
    permission: 'orgSchoolExam:list'
  },
  {
    label: 'Org Masters',
    icon: 'fa-solid fa-sitemap',
    children: [
      // NOTE: no catalog key exists yet for Institute — it's unreachable
      // via permissions until the backend adds one (e.g. orgInstitute:list).
      // isAdmin logins still see it (PermissionService bypasses the check),
      // so this only affects non-admin users assigned granular permissions.
      {
        label: 'Institute',
        icon: 'fa-solid fa-building-columns',
        route: '/app/org-master/institute',
        permission: []
      },
      {
        label: 'Center',
        icon: 'fa-solid fa-landmark',
        route: '/app/org-master/center',
        permission: 'orgCenter:list'
      },
      {
        label: 'Staff',
        icon: 'fa-solid fa-users',
        route: '/app/org-master/staff',
        permission: 'orgStaff:list'
      },
      {
        label: 'Program',
        icon: 'fa-solid fa-graduation-cap',
        route: '/app/org-master/program',
        permission: 'orgProgram:list'
      },
      {
        label: 'Department',
        icon: 'fa-solid fa-briefcase',
        route: '/app/org-master/department',
        permission: 'orgDept:list'
      },
      {
        label: 'Subject',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/subject',
        permission: 'orgSubject:list'
      },
      {
        label: 'Topic',
        icon: 'fa-solid fa-book-open',
        route: '/app/org-master/topics',
        permission: 'orgTopic:list'
      },
      {
        label: 'Sub Topic',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/sub-topic',
        permission: 'orgSubTopic:list'
      },
      {
        label: 'Category',
        icon: 'fa-solid fa-book-open',
        route: '/app/org-master/category',
        permission: 'orgExamCategory:list'
      },
      {
        label: 'Sub Category',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/sub-category',
        permission: 'orgExamCategory:list'
      },
      {
        label: 'Users',
        icon: 'fa-solid fa-user',
        route: '/app/org-master/users',
        permission: 'orgUser:list'
      },
      {
        label: 'Help Center',
        icon: 'fa-solid fa-circle-question',
        route: '/app/org-master/help-center',
        permission: 'orgHelpCenter:list'
      }
    ]
  }
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Report',
    icon: 'fa-solid fa-gauge',
    route: '/app/dashboard/report'
  }
];
