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
      { id: 'view_orders', label: 'View Orders', desc: 'Browse and search through customer orders' },
      { id: 'update_order_status', label: 'Update Order Status', desc: 'Transition order states (e.g. processing, shipped, delivered)' },
      { id: 'cancel_orders', label: 'Cancel Orders', desc: 'Cancel orders and trigger refund processing' },
      { id: 'view_order_details', label: 'View Order Details', desc: 'Access in-depth order metadata, shipping details, and items' }
    ]
  },
  {
    title: 'Products',
    permissions: [
      { id: 'create_products', label: 'Create Products', desc: 'Add new items, attributes, and variants to the catalog' },
      { id: 'edit_products', label: 'Edit Products', desc: 'Modify details, pricing, and visual assets of catalog items' },
      { id: 'delete_products', label: 'Delete Products', desc: 'Permanently remove items from the active catalog' },
      { id: 'view_products', label: 'View Products', desc: 'View items and search the active catalog' }
    ]
  },
  {
    title: 'Inventory & Stock',
    permissions: [
      { id: 'view_inventory', label: 'View Inventory', desc: 'Access inventory logs, stock status, and low stock thresholds' },
      { id: 'update_stock', label: 'Update Stock', desc: 'Replenish, adjust, or write off stock quantities' }
    ]
  },
  {
    title: 'Customers',
    permissions: [
      { id: 'view_customers', label: 'View Customers', desc: 'Browse customer list, profiles, and basic details' },
      { id: 'view_customer_history', label: 'View Customer History', desc: 'Access customer purchases, invoices, and lifetime metrics' }
    ]
  },
  {
    title: 'Inquiries',
    permissions: [
      { id: 'view_inquiries', label: 'View Inquiries', desc: 'Browse contact requests, inquiries, and customer feedback' },
      { id: 'update_inquiry_status', label: 'Update Inquiry Status', desc: 'Mark inquiries as pending, in-progress, or completed' },
      { id: 'reply_inquiry', label: 'Resolve/Reply to Inquiry', desc: 'Compose and dispatch direct email replies to inquiries' }
    ]
  },
  {
    title: 'Reviews',
    permissions: [
      { id: 'view_reviews', label: 'View Reviews', desc: 'Browse customer product reviews and ratings' },
      { id: 'moderate_reviews', label: 'Moderate Reviews', desc: 'Hide, publish, or delete product reviews' },
      { id: 'reply_reviews', label: 'Reply to Reviews', desc: 'Post official Durga Shakti Foils replies to reviews' }
    ]
  },
  {
    title: 'Payments',
    permissions: [
      { id: 'view_transactions', label: 'View Transactions', desc: 'Inspect financial transactions, receipts, and gateway details' },
      { id: 'update_payment_status', label: 'Update Payment Status', desc: 'Manually capture, void, or reconcile payment statuses' },
      { id: 'export_payment_reports', label: 'Export Reports', desc: 'Download financial summaries and spreadsheet transaction exports' }
    ]
  },
  {
    title: 'Analytics',
    permissions: [
      { id: 'view_analytics', label: 'View Analytics', desc: 'Access charts, performance counters, and sales trends' }
    ]
  },
  {
    title: 'GSTR1',
    permissions: [
      { id: 'view_gst_reports', label: 'View GSTR1', desc: 'Access invoice-based GSTR1 export filters' },
      { id: 'export_gst_reports', label: 'Export GSTR1', desc: 'Download audited GSTR1 Excel workbooks' }
    ]
  },
  {
    title: 'Audit Logs',
    permissions: [
      { id: 'view_audit_logs', label: 'View Logs Only', desc: 'Inspect read-only security registers and administrative history' }
    ]
  },
  {
    title: 'Admin Management',
    permissions: [
      { id: 'create_admin', label: 'Create Admin', desc: 'Provision new staff or manager credential sets' },
      { id: 'edit_admin', label: 'Edit Admin', desc: 'Modify attributes of existing administrative staff' },
      { id: 'disable_admin', label: 'Disable Admin', desc: 'Deactivate staff access rights and terminate active sessions' },
      { id: 'delete_admin', label: 'Delete Admin', desc: 'Permanently remove staff rows from the system' },
      { id: 'assign_permissions', label: 'Assign Permissions', desc: 'Delegate specific functional capability bounds to staff' }
    ]
  },
  {
    title: 'Dashboard & Layout',
    permissions: [
      { id: 'view_dashboard', label: 'View Dashboard', desc: 'Access core business summary overview cards and operations' }
    ]
  },
  {
    title: 'Settings & Configuration',
    permissions: [
      { id: 'manage_settings', label: 'Manage Settings', desc: 'Access and modify payment settings (COD toggle, etc.)' },
      { id: 'manage_banner', label: 'Manage Banner', desc: 'Edit the scrolling announcement banner and countdown timer' },
      { id: 'manage_coupons', label: 'Manage Coupons', desc: 'Create, edit, assign, and analyze coupon campaigns' }
    ]
  }
];

export const ROLE_TEMPLATES = {
  OPERATIONS_ADMIN: {
    label: 'Operations Admin',
    permissions: {
      view_orders: true, update_order_status: true, cancel_orders: true, view_order_details: true,
      create_products: true, edit_products: true, delete_products: true, view_products: true,
      view_inventory: true, update_stock: true,
      view_customers: true, view_customer_history: true,
      view_inquiries: true, update_inquiry_status: true, reply_inquiry: true,
      view_reviews: true, moderate_reviews: true, reply_reviews: true,
      view_transactions: true, update_payment_status: true, export_payment_reports: true,
      view_analytics: true,
      view_gst_reports: true, export_gst_reports: true,
      view_audit_logs: true,
      view_dashboard: true,
      manage_settings: true,
      manage_banner: true,
      manage_coupons: true
    }
  },
  ORDER_MANAGER: {
    label: 'Order Manager',
    permissions: {
      view_orders: true, update_order_status: true, cancel_orders: true, view_order_details: true,
      view_dashboard: true
    }
  },
  PRODUCT_MANAGER: {
    label: 'Product Manager',
    permissions: {
      create_products: true, edit_products: true, delete_products: true, view_products: true,
      view_dashboard: true
    }
  },
  INVENTORY_MANAGER: {
    label: 'Inventory Manager',
    permissions: {
      view_inventory: true, update_stock: true, view_products: true,
      view_dashboard: true
    }
  },
  CUSTOMER_SUPPORT: {
    label: 'Customer Support Admin',
    permissions: {
      view_customers: true, view_inquiries: true, update_inquiry_status: true, reply_inquiry: true,
      view_reviews: true, moderate_reviews: true, reply_reviews: true,
      view_dashboard: true
    }
  },
  SHIPPING_MANAGER: {
    label: 'Shipping Manager',
    permissions: {
      view_orders: true, update_order_status: true, view_order_details: true,
      view_dashboard: true
    }
  },
  FINANCE_ADMIN: {
    label: 'Finance Admin',
    permissions: {
      view_orders: true, view_order_details: true,
      view_transactions: true, export_payment_reports: true,
      view_gst_reports: true, export_gst_reports: true,
      view_dashboard: true
    }
  },
  ANALYTICS_VIEWER: {
    label: 'Analytics Viewer',
    permissions: {
      view_analytics: true,
      view_dashboard: true
    }
  },
  CUSTOM: {
    label: 'Custom Admin',
    permissions: {}
  }
};

export const getAllPermissionKeys = () => {
  return PERMISSION_GROUPS.flatMap(group => group.permissions.map(p => p.id));
};

export const superAdminSidebar = [
  { label: 'Dashboard', permissions: ['view_dashboard'] },
  { label: 'Orders', permissions: ['view_orders', 'update_order_status', 'cancel_orders', 'view_order_details'] },
  { label: 'Products', permissions: ['view_products', 'create_products', 'edit_products', 'delete_products'] },
  { label: 'Categories', permissions: ['create_products', 'edit_products'] },
  { label: 'Stock', permissions: ['view_inventory', 'update_stock'] },
  { label: 'Customers', permissions: ['view_customers', 'view_customer_history'] },
  { label: 'Inquiries', permissions: ['view_inquiries', 'update_inquiry_status', 'reply_inquiry'] },
  { label: 'Reviews', permissions: ['view_reviews', 'moderate_reviews', 'reply_reviews'] },
  { label: 'Payments', permissions: ['view_transactions', 'update_payment_status', 'export_payment_reports'] },
  { label: 'Analytics', permissions: ['view_analytics'] },
  { label: 'GSTR1', permissions: ['view_gst_reports', 'export_gst_reports'] },
  { label: 'Admins', permissions: ['create_admin', 'edit_admin', 'disable_admin', 'delete_admin', 'assign_permissions'] },
  { label: 'Audit Logs', permissions: ['view_audit_logs'] },
  { label: 'Settings', permissions: ['manage_settings', 'manage_banner'] },
  { label: 'Shipping Settings', permissions: ['manage_settings'] },
  { label: 'Coupons', permissions: ['manage_coupons', 'manage_settings'] },
];

export const isAdminRole = (role) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role);
export const isSuperAdminRole = (role) => role === ROLES.SUPER_ADMIN;
