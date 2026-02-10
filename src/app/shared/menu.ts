export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
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
    route: '/app/dashboard'
  },
  {
    label: 'Batch',
    icon: 'fa-solid fa-layer-group',
    route: '/app/batch'
  },
  {
    label: 'Timetable',
    icon: 'fa-solid fa-calendar-days',
    route: '/app/timetable'
  },
  {
    label: 'Attendance',
    icon: 'fa-solid fa-clipboard-check',
    route: '/app/attendance'
  },
  // {
  //   label: 'Teachers',
  //   icon: 'fa-solid fa-chalkboard-user',
  //   route: '/app/teacher',
  // },
  // {
  //   label: 'Students',
  //   icon: 'fa-solid fa-user-graduate',
  //   route: '/app/student',
  // },
  // {
  //   label: 'Chat',
  //   icon: 'fa-solid fa-comments',
  //   route: '/app/chat',
  // },
  // {
  //   label: 'Communication',
  //   icon: 'fa-solid fa-comments',
  //   route: '/app/communication',
  // },
  {
    label: 'Assignment',
    icon: 'fa-solid fa-file-pen',
    route: '/app/assignment'
  },
  {
    label: 'Enable Assignment',
    icon: 'fa-solid fa-file-pen',
    route: '/app/enableassignment'
  },
  {
    label: 'Tests',
    icon: 'fa-solid fa-file-pen',
    route: '/app/tests'
  },
  // {
  //   label: 'Activities',
  //   icon: 'fa-solid fa-list-check',
  //   route: '/app/activity',
  // },
  // {
  //   label: 'Feedback',
  //   icon: 'fa-solid fa-award',
  //   route: '/app/feedback',
  // },
  // {
  //   label: 'Suport',
  //   icon: 'fa-solid fa-headset',
  //   route: '/app/support',
  // },
  // {
  //   label: 'Student Performance',
  //   icon: 'fa-solid fa-chart-column',
  //   route: '/app/performance',
  // },
  // {
  //   label: 'PTM',
  //   icon: 'fa-solid fa-people-group',
  //   route: '/app/ptm',
  // },
  // {
  //   label: 'Package',
  //   icon: 'fa-solid fa-box-open',
  //   route: '/app/package',
  // },
  // {
  //   label: 'Knowledge Base',
  //   icon: 'fa-solid fa-book-open',
  //   route: '/app/knowledge',
  // },
  // {
  //   label: 'Tasks',
  //   icon: 'fa-solid fa-list-check',
  //   route: '/app/task',
  // },
  // {
  //   label: 'Report',
  //   icon: 'fa-solid fa-chart-line',
  //   route: '/app/report',
  // },
  {
    label: 'Org Masters',
    icon: 'fa-solid fa-sitemap',
    children: [
      {
        label: 'Institute',
        icon: 'fa-solid fa-building-columns',
        route: '/app/org-master/institute'
      },
      {
        label: 'Center',
        icon: 'fa-solid fa-landmark',
        route: '/app/org-master/center'
      },
      {
        label: 'Program',
        icon: 'fa-solid fa-graduation-cap',
        route: '/app/org-master/program'
      },
      {
        label: 'Department',
        icon: 'fa-solid fa-briefcase',
        route: '/app/org-master/department'
      },
      {
        label: 'Topic',
        icon: 'fa-solid fa-book-open',
        route: '/app/org-master/topics'
      },
      {
        label: 'Sub Topic',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/sub-topic'
      },
      {
        label: 'Category',
        icon: 'fa-solid fa-book-open',
        route: '/app/org-master/category'
      },
      {
        label: 'Sub Category',
        icon: 'fa-solid fa-book',
        route: '/app/org-master/sub-category'
      },
      {
        label: 'CGPA Config',
        icon: 'fa-solid fa-cogs',
        route: '/app/org-master/cgpa'
      },
      {
        label: 'Exam Config',
        icon: 'fa-solid fa-sliders-h',
        route: '/app/org-master/exam'
      }
    ]
  }
  // {
  //   label: 'Phase Plan',
  //   icon: 'fa-solid fa-hourglass-half',
  //   route: '/app/phase'
  // },
  // {
  //   label: 'Circular',
  //   icon: 'fa-solid fa-bullhorn',
  //   route: '/app/circular'
  // }
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Report',
    icon: 'fa-solid fa-gauge',
    route: '/app/dashboard/report'
  }
];
