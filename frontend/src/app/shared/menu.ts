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
    label: 'Attendance',
    icon: 'fa-solid fa-gauge',
    route: '/app/attendance',
  },
  {
    label: 'My Batch',
    icon: 'fa-solid fa-arrow-down',
    route: '/app/batch',
  },
  {
    label: 'My Class',
    icon: 'fa-solid fa-arrow-up',
    route: '/app/class',
  },
  {
    label: 'My Student',
    icon: 'fa-solid fa-arrow-up',
    route: '/app/student',
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