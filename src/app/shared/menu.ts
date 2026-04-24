// export interface MenuItem {
//   label: string;
//   icon: string;
//   route?: string;
//   children?: MenuItem[];
//   expanded?: boolean;
// }

// export interface NavItem {
//   label: string;
//   icon: string;
//   route: string;
// }

// export const MENU_ITEMS: MenuItem[] = [
//   {
//     label: 'Dashboard',
//     icon: 'fa-solid fa-gauge',
//     route: '/app/dashboard'
//   },
//   {
//     label: 'Batch',
//     icon: 'fa-solid fa-layer-group',
//     route: '/app/batch'
//   },
//   {
//     label: 'Timetable',
//     icon: 'fa-solid fa-calendar-days',
//     route: '/app/timetable'
//   },
//   {
//     label: 'Attendance',
//     icon: 'fa-solid fa-clipboard-check',
//     route: '/app/attendance'
//   },
//   {
//     label: 'Students',
//     icon: 'fa-solid fa-user-graduate',
//     route: '/app/student'
//   },
//   {
//     label: 'Teachers',
//     icon: 'fa-solid fa-chalkboard-user',
//     route: '/app/teacher'
//   },
//   {
//     label: 'Assignments',
//     icon: 'fa-solid fa-file-pen',
//     route: '/app/assignment'
//   },
//   {
//     label: 'Enable Assignment',
//     icon: 'fa-solid fa-file-pen',
//     route: '/app/enableassignment'
//   },
//   {
//     label: 'Phase Plan',
//     icon: 'fa-solid fa-hourglass-half',
//     route: '/app/phase'
//   },
//   {
//     label: 'Activities',
//     icon: 'fa-solid fa-list-check',
//     route: '/app/activity'
//   },
//   {
//     label: 'Student Performance',
//     icon: 'fa-solid fa-chart-column',
//     route: '/app/performance'
//   },
//   {
//     label: 'Tasks',
//     icon: 'fa-solid fa-list-check',
//     route: '/app/task'
//   },
//   {
//     label: 'PTM',
//     icon: 'fa-solid fa-people-group',
//     route: '/app/ptm'
//   },
//   {
//     label: 'Library',
//     icon: 'fa-solid fa-book-open',
//     route: '/app/knowledge'
//   },
//   {
//     label: 'Study Material',
//     icon: 'fa-solid fa-box-open',
//     route: '/app/package'
//   },
//   {
//     label: 'Circular',
//     icon: 'fa-solid fa-bullhorn',
//     route: '/app/circular'
//   },
//   {
//     label: 'Feedback',
//     icon: 'fa-solid fa-award',
//     route: '/app/feedback'
//   },
//   {
//     label: 'Suport',
//     icon: 'fa-solid fa-headset',
//     route: '/app/support'
//   },
//   {
//     label: 'Report',
//     icon: 'fa-solid fa-chart-line',
//     route: '/app/report'
//   },
//   {
//     label: 'Chat',
//     icon: 'fa-solid fa-comments',
//     route: '/app/chat'
//   },
//   {
//     label: 'Communication',
//     icon: 'fa-solid fa-comments',
//     route: '/app/communication'
//   },
//   {
//     label: 'Org Masters',
//     icon: 'fa-solid fa-sitemap',
//     children: [
//       {
//         label: 'Institute',
//         icon: 'fa-solid fa-building-columns',
//         route: '/app/org-master/institute'
//       },
//       {
//         label: 'Center',
//         icon: 'fa-solid fa-landmark',
//         route: '/app/org-master/center'
//       },
//       {
//         label: 'Staff',
//         icon: 'fa-solid fa-users',
//         route: '/app/org-master/staff'
//       },
//       {
//         label: 'Program',
//         icon: 'fa-solid fa-graduation-cap',
//         route: '/app/org-master/program'
//       },
//       {
//         label: 'Department',
//         icon: 'fa-solid fa-briefcase',
//         route: '/app/org-master/department'
//       },
//       {
//         label: 'Topic',
//         icon: 'fa-solid fa-book-open',
//         route: '/app/org-master/topics'
//       },
//       {
//         label: 'Sub Topic',
//         icon: 'fa-solid fa-book',
//         route: '/app/org-master/sub-topic'
//       },
//       {
//         label: 'Category',
//         icon: 'fa-solid fa-book-open',
//         route: '/app/org-master/category'
//       },
//       {
//         label: 'Sub Category',
//         icon: 'fa-solid fa-book',
//         route: '/app/org-master/sub-category'
//       },
//       {
//         label: 'School Exams',
//         icon: 'fa-solid fa-chalkboard-user',
//         route: '/app/org-master/school/exams'
//       },
//       {
//         label: 'Users',
//         icon: 'fa-solid fa-user',
//         route: '/app/org-master/users'
//       }
//     ]
//   }
// ];

// export const MENU_ASSIGNMENT: MenuItem[] = [
//   {
//     label: 'Assignments',
//     icon: 'fa-solid fa-file-pen',
//     route: '/app/assignment'
//   }
// ];

// export const NAV_ITEMS: NavItem[] = [
//   {
//     label: 'Report',
//     icon: 'fa-solid fa-gauge',
//     route: '/app/dashboard/report'
//   }
// ];

// ============================================================
//  menu.ts  –  Menu items with role-based visibility
//  Place at: src/app/shared/menu.ts  (replaces existing file)
// ============================================================

import { RoleLevel } from './role.config';

export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  roles: RoleLevel[]; // which roles see this menu item
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
    roles: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
  },
  {
    label: 'Batch',
    icon: 'fa-solid fa-layer-group',
    route: '/app/batch',
    roles: ['L1', 'L2', 'L3']
  },
  {
    label: 'Timetable',
    icon: 'fa-solid fa-calendar-days',
    route: '/app/timetable',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Attendance',
    icon: 'fa-solid fa-clipboard-check',
    route: '/app/attendance',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'School Attendance',
    icon: 'fa-solid fa-clipboard-check',
    route: '/app/school-attendance',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Students',
    icon: 'fa-solid fa-user-graduate',
    route: '/app/student',
    roles: ['L1', 'L2', 'L3']
  },
  {
    label: 'Teachers',
    icon: 'fa-solid fa-chalkboard-user',
    route: '/app/teacher',
    roles: ['L1', 'L6']
  },
  {
    label: 'Assignments',
    icon: 'fa-solid fa-file-pen',
    route: '/app/assignment',
    roles: ['L1', 'L3', 'L7']
  },
  {
    label: 'Enable Assignment',
    icon: 'fa-solid fa-file-circle-check',
    route: '/app/enableassignment',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Phase Plan',
    icon: 'fa-solid fa-hourglass-half',
    route: '/app/phase',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Activities',
    icon: 'fa-solid fa-list-check',
    route: '/app/activity',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Student Performance',
    icon: 'fa-solid fa-chart-column',
    route: '/app/performance',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Tasks',
    icon: 'fa-solid fa-list-check',
    route: '/app/task',
    roles: ['L1', 'L2', 'L3', 'L4']
  },
  {
    label: 'PTM',
    icon: 'fa-solid fa-people-group',
    route: '/app/ptm',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Library',
    icon: 'fa-solid fa-book-open',
    route: '/app/knowledge',
    roles: ['L1', 'L3', 'L4']
  },
  {
    label: 'Study Material',
    icon: 'fa-solid fa-box-open',
    route: '/app/package',
    roles: ['L1', 'L2']
  },
  {
    label: 'Circular',
    icon: 'fa-solid fa-bullhorn',
    route: '/app/circular',
    roles: ['L1', 'L2', 'L3']
  },
  {
    label: 'Feedback',
    icon: 'fa-solid fa-award',
    roles: ['L1', 'L3', 'L4'],
    children: [
      {
        label: 'Feedback',
        icon: 'fa-solid fa-commenting',
        route: '/app/feedback',
        roles: ['L1', 'L3', 'L4']
      },
      {
        label: 'Templates',
        icon: 'fa-solid fa-newspaper',
        route: '/app/feedback/feedback/template',
        roles: ['L1', 'L3']
      },
      {
        label: 'Report',
        icon: 'fa-solid fa-table-list',
        route: '/app/feedback/consolidated-report',
        roles: ['L1', 'L3']
      }
    ]
  },
  {
    label: 'Reports',
    icon: 'fa-solid fa-chart-line',
    route: '/app/report',
    roles: ['L1', 'L5']
  },
  // {
  //   label: 'Chat',
  //   icon: 'fa-solid fa-comments',
  //   route: '/app/chat',
  //   roles: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
  // },
  {
    label: 'Communication',
    icon: 'fa-solid fa-envelope-open-text',
    roles: ['L1', 'L2', 'L3'],
    children: [
      {
        label: 'Send',
        icon: 'fa-solid fa-paper-plane',
        route: '/app/communication/send',
        roles: ['L1', 'L2', 'L3']
      },
      {
        label: 'Templates',
        icon: 'fa-solid fa-file-lines',
        route: '/app/communication/templates',
        roles: ['L1', 'L2', 'L3']
      },
      {
        label: 'Sent Logs',
        icon: 'fa-solid fa-clock-rotate-left',
        route: '/app/communication/sent-logs',
        roles: ['L1', 'L2', 'L3']
      }
    ]
  },
  {
    label: 'Support',
    icon: 'fa-solid fa-headset',
    route: '/app/support',
    roles: ['L1', 'L2', 'L3', 'L5', 'L6']
  },
  {
    label: 'Exams',
    icon: 'fa-solid fa-file-circle-question',
    roles: ['L1', 'L5'],
    children: [
      {
        label: 'Instructions',
        icon: 'fa-solid fa-clipboard-list',
        route: '/app/exams/instructions',
        roles: ['L1', 'L5']
      },
      {
        label: 'Passage',
        icon: 'fa-solid fa-book-open-reader',
        route: '/app/exams/passage',
        roles: ['L1', 'L5']
      },
      {
        label: 'Questions',
        icon: 'fa-solid fa-circle-question',
        route: '/app/exams/questions',
        roles: ['L1', 'L5']
      },
      {
        label: 'Exams',
        icon: 'fa-solid fa-file-pen',
        route: '/app/exams/exams',
        roles: ['L1', 'L5']
      }
    ]
  },
  {
    label: 'School Exams',
    icon: 'fa-solid fa-chalkboard-user',
    route: '/app/org-master/school/exams',
    roles: ['L1']
  },
  {
    label: 'Org Masters',
    icon: 'fa-solid fa-sitemap',
    roles: ['L1'],
    children: [
      {
        label: 'Institute',
        icon: 'fa-solid fa-building-columns',
        route: '/app/org-master/institute',
        roles: ['L1']
      },
      {
        label: 'Center',
        icon: 'fa-solid fa-landmark',
        route: '/app/org-master/center',
        roles: ['L1']
      },
      {
        label: 'Staff',
        icon: 'fa-solid fa-users',
        route: '/app/org-master/staff',
        roles: ['L1']
      },
      {
        label: 'Program',
        icon: 'fa-solid fa-graduation-cap',
        route: '/app/org-master/program',
        roles: ['L1']
      },
      {
        label: 'Department',
        icon: 'fa-solid fa-briefcase',
        route: '/app/org-master/department',
        roles: ['L1']
      },
      {
        label: 'Topic',
        icon: 'fa-solid fa-book-open',
        route: '/app/org-master/topics',
        roles: ['L1']
      },
      {
        label: 'Sub Topic',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/sub-topic',
        roles: ['L1']
      },
      {
        label: 'Category',
        icon: 'fa-solid fa-book-open',
        route: '/app/org-master/category',
        roles: ['L1']
      },
      {
        label: 'Sub Category',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/sub-category',
        roles: ['L1']
      },
      {
        label: 'Users',
        icon: 'fa-solid fa-user',
        route: '/app/org-master/users',
        roles: ['L1']
      }
      // {
      //   label: 'CGPA Config',
      //   icon: 'fa-solid fa-cogs',
      //   route: '/app/org-master/cgpa',
      //   roles: ['L1']
      // },
      // {
      //   label: 'Exam Config',
      //   icon: 'fa-solid fa-sliders-h',
      //   route: '/app/org-master/exam',
      //   roles: ['L1']
      // }
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
