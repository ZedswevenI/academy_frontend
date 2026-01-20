export interface MenuItem {
  label: string;
  icon: string;
  route: string;
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
  },
  {
    label: 'Batch',
    icon: 'fa-solid fa-layer-group',
    route: '/app/batch',
  },
  {
    label: 'Timetable',
    icon: 'fa-solid fa-calendar-days',
    route: '/app/timetable'
  },
  {
    label: 'Attendance',
    icon: 'fa-solid fa-clipboard-check',
    route: '/app/attendance',
  },
  {
    label: 'Report',
    icon: 'fa-solid fa-chart-line',
    route: '/app/report',
  },
  {
    label: 'Teachers',
    icon: 'fa-solid fa-chalkboard-user',
    route: '/app/teacher',
  },
  {
    label: 'Students',
    icon: 'fa-solid fa-user-graduate',
    route: '/app/student',
  },
  {
    label: 'Communication',
    icon: 'fa-solid fa-comments',
    route: '/app/communication',
  },
  {
    label: 'Assignment',
    icon: 'fa-solid fa-file-pen',
    route: '/app/assignment',
  },
  {
    label: 'Activities',
    icon: 'fa-solid fa-list-check',
    route: '/app/activity',
  },
  {
    label: 'Feedback',
    icon: 'fa-solid fa-award',
    route: '/app/feedback',
  },
  {
    label: 'Suport',
    icon: 'fa-solid fa-headset',
    route: '/app/support',
  },
  {
    label: 'Student Performance',
    icon: 'fa-solid fa-chart-column',
    route: '/app/performance',
  },
  {
    label: 'PTM',
    icon: 'fa-solid fa-people-group',
    route: '/app/ptm',
  },
  {
    label: 'Package',
    icon: 'fa-solid fa-box-open',
    route: '/app/package',
  },
  {
    label: 'Knowledge Base',
    icon: 'fa-solid fa-book-open',
    route: '/app/knowledge',
  },
  {
    label: 'Tasks',
    icon: 'fa-solid fa-list-check',
    route: '/app/task',
  },
  {
    label: 'Org Masters',
    icon: 'fa-solid fa-sitemap',
    route: '/app/org-master',
  },
  {
    label: 'Phase Plan',
    icon: 'fa-solid fa-hourglass-half',
    route: '/app/phase',
  },
  {
    label: 'Circular',
    icon: 'fa-solid fa-bullhorn',
    route: '/app/circular',
  },
  // {
  //   label: 'Class',
  //   icon: 'fa-solid fa-chalkboard-user',
  //   route: '/app/class',
  // },
  // {
  //   label: 'My Class',
  //   icon: 'fa-solid fa-arrow-up',
  //   route: '/app/inward',
  // },
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Report',
    icon: 'fa-solid fa-gauge',
    route: '/app/dashboard/report',
  },
]