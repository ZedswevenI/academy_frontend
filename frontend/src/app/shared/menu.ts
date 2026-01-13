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
    label: 'Timetable',
    icon: 'fa-solid fa-calendar-days',
    route: '/app/timetable'
  },
  {
    label: 'Batch',
    icon: 'fa-solid fa-layer-group',
    route: '/app/batch',
  },
  // {
  //   label: 'Class',
  //   icon: 'fa-solid fa-chalkboard-user',
  //   route: '/app/class',
  // },
  {
    label: 'Student',
    icon: 'fa-solid fa-user-graduate',
    route: '/app/student',
  },
  // {
  //   label: 'Attendance',
  //   icon: 'fa-solid fa-clipboard-check',
  //   route: '/app/attendance',
  // },
  {
    label: 'Assignment',
    icon: 'fa-solid fa-file-lines',
    route: '/app/assignment',
  },
  {
    label: 'Task',
    icon: 'fa-solid fa-list-check',
    route: '/app/task',
  },
  {
    label: 'Communication',
    icon: 'fa-solid fa-comments',
    route: '/app/communication',
  },
  {
    label: 'Knowledge Base',
    icon: 'fa-solid fa-book-open',
    route: '/app/knowledge',
  },
  {
    label: 'Student Performance',
    icon: 'fa-solid fa-chart-column ',
    route: '/app/performance',
  },
  {
    label: 'Phase Plan',
    icon: 'fa-solid fa-hourglass-half',
    route: '/app/phase',
  },
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