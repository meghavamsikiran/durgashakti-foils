export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
};

export const superAdminSidebar = [
  'Dashboard',
  'Products',
  'Inventory',
  'Orders',
  'Customers',
  'Payments',
  'Analytics',
  'GST Reports',
  'Import GST Data',
  'Admins',
  'Audit Logs',
  'Settings',
];

export const adminSidebar = ['Dashboard', 'Orders', 'Customers'];

export const isAdminRole = (role) => [ROLES.SUPER_ADMIN, ROLES.ADMIN, 'admin'].includes(role);
export const isSuperAdminRole = (role) => [ROLES.SUPER_ADMIN].includes(role);
