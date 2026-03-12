export interface SidebarItem {
  label: string;
  route?: string;
  roles?: ('ADMIN' | 'USER')[];
  children?: SidebarItem[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    roles: ['ADMIN', 'USER']
  },
  {
    label: 'Rendiciones',
    roles: ['ADMIN', 'USER'],
    children: [
      { label: 'Cabeceras', route: '/rend-m', roles: ['ADMIN', 'USER'] },
    ]
  },
  {
    label: 'Administración',
    roles: ['ADMIN'],
    children: [
      { label: 'Usuarios',  route: '/users' },
      { label: 'Perfiles',  route: '/perfiles' },
    ]
  },
];
