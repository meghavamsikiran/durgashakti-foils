/**
 * Centralized RBAC Constants for DurgaShakti Foils Admin Panel.
 * Role values MUST match backend exactly: "admin", "SUPER_ADMIN"
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

/**
 * Granular Permission Architecture
 */
export const PERMISSION_GROUPS = [
  {
    title: 'Orders',
    permissions: [
      { id: 'manage_orders', label: 'Manage Orders', desc: 'View, update, and cancel customer orders' },
    ]
  },
  {
    title: 'Products & Inventory',
    permissions: [
      { id: 'manage_products', label: 'Manage Products', desc: 'Create, edit, and delete store products' },
      { id: 'manage_inventory', label: 'Manage Inventory', desc: 'Update product stock levels and batches' }
    ]
  },
  {
    title: 'Customers',
    permissions: [
      { id: 'manage_customers', label: 'Manage Customers', desc: 'View customer accounts, details, and history' }
    ]
  },
  {
    title: 'Financial & Reports',
    permissions: [
      { id: 'access_financial_reports', label: 'Access Financial Reports', desc: 'View store revenue, payments, and sales analytics' },
      { id: 'access_gst_reports', label: 'Access GST Reports', desc: 'Import and view GST B2B/B2C data' }
    ]
  },
  {
    title: 'System',
    permissions: [
      { id: 'manage_admins', label: 'Manage Admins', desc: 'Create, edit, and manage admin access and roles' },
      { id: 'manage_settings', label: 'Manage Settings', desc: 'Update store configuration and core settings' }
    ]
  }
];

export const getAllPermissionKeys = () => {
  return PERMISSION_GROUPS.flatMap(group => group.permissions.map(p => p.id));
};

export const superAdminSidebar = [
  { label: 'Dashboard', permission: null },
  { label: 'Orders', permission: 'manage_orders' },
  { label: 'Products', permission: 'manage_products' },
  { label: 'Stock', permission: 'manage_inventory' },
  { label: 'Customers', permission: 'manage_customers' },
  { label: 'Payments', permission: 'access_financial_reports' },
  { label: 'Analytics', permission: 'access_financial_reports' },
  { label: 'GST Reports', permission: 'access_gst_reports' },
  { label: 'Import GST Data', permission: 'access_gst_reports' },
  { label: 'Admins', permission: 'manage_admins' },
  { label: 'Audit Logs', permission: 'manage_admins' },
  { label: 'Settings', permission: 'manage_settings' },
];

export const isAdminRole = (role) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role);
export const isSuperAdminRole = (role) => role === ROLES.SUPER_ADMIN;
