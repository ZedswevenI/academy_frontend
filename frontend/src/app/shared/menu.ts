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
    label: 'Inward',
    icon: 'fa-solid fa-arrow-down',
    route: '/app/inward',
  },
  {
    label: 'Dispatch',
    icon: 'fa-solid fa-arrow-up',
    route: '/app/dispatch',
  },
  {
    label: 'Picking',
    icon: 'fa-solid fa-box',
    route: '/app/picking',
  },
  {
    label: 'Delivery',
    icon: 'fa-solid fa-truck',
    route: '/app/delivery',
  },
  {
    label: 'Reports',
    icon: 'fa-solid fa-chart-column',
    route: '/app/report',
  },
  {
    label: 'Products',
    icon: 'fa-solid fa-cart-shopping',
    route: '/app/product',
  },

];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Report',
    icon: 'fa-solid fa-gauge',
    route: '/app/dashboard/report',
  },
  {
    label: 'Warehouse',
    icon: 'fa-solid fa-warehouse',
    route: '/app/warehouse',
  },
  {
    label: 'Location',
    icon: 'fa-solid fa-map-pin',
    route: '/app/location',
  },
  {
    label: 'Users',
    icon: 'fa-solid fa-users',
    route: '/app/user',
  },
]