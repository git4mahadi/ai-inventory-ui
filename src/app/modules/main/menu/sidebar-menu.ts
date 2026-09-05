/**
 * Sidebar navigation tree.
 * Add / nest items here — the layout renders this structure dynamically.
 */
import { AccessContext, MenuRoles } from '../../../core/security/menu-access';

export interface SidebarMenuNode {
  /** Unique key used for expand/collapse state */
  id: string;
  label: string;
  /** Compact label shown when the sidebar rail is collapsed */
  shortLabel: string;
  /** Route for leaf items; omit for parent/group nodes */
  link?: string;
  /** Exact routerLinkActive match (default false) */
  exact?: boolean;
  /** Nested children — clicking the parent toggles these */
  children?: SidebarMenuNode[];
  /** Start expanded when children exist (default false) */
  expandedByDefault?: boolean;
  /** JWT roles; user needs any one of these (ignored for ADMIN / SUPER_ADMIN) */
  roles?: readonly string[];
  /** Only ADMIN / SUPER_ADMIN authority may see this node */
  requireAdmin?: boolean;
}

export const SIDEBAR_MENU: SidebarMenuNode[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'DB',
    link: '/dashboard',
    exact: true,
  },
  {
    id: 'opening-stocks',
    label: 'Opening Stock',
    shortLabel: 'OS',
    expandedByDefault: false,
    children: [
      {
        id: 'opening-stocks-list',
        label: 'Opening Stock List',
        shortLabel: 'OL',
        link: '/opening-stocks/list',
        roles: MenuRoles.openingStockList,
      },
      {
        id: 'opening-stocks-create',
        label: 'Opening Stock Create',
        shortLabel: 'OC',
        link: '/opening-stocks/create',
        roles: MenuRoles.openingStockCreate,
      },
    ],
  },
  {
    id: 'purchase-orders',
    label: 'Purchase Orders',
    shortLabel: 'PO',
    expandedByDefault: false,
    children: [
      {
        id: 'purchase-orders-list',
        label: 'Purchase Order List',
        shortLabel: 'PL',
        link: '/purchase-orders/list',
        roles: MenuRoles.purchaseOrderList,
      },
      {
        id: 'purchase-orders-create',
        label: 'Purchase Order Create',
        shortLabel: 'PC',
        link: '/purchase-orders/create',
        roles: MenuRoles.purchaseOrderCreate,
      },
    ],
  },
  {
    id: 'receives',
    label: 'Item Receive',
    shortLabel: 'IR',
    expandedByDefault: false,
    children: [
      {
        id: 'receives-list',
        label: 'Receive List',
        shortLabel: 'RL',
        link: '/receives/list',
        roles: MenuRoles.receiveList,
      },
      {
        id: 'receives-create',
        label: 'Receive Create',
        shortLabel: 'RC',
        link: '/receives/create',
        roles: MenuRoles.receiveCreate,
      },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    shortLabel: 'SL',
    expandedByDefault: false,
    children: [
      {
        id: 'sales-list',
        label: 'Sales List',
        shortLabel: 'LS',
        link: '/sales/list',
        roles: MenuRoles.salesList,
      },
      {
        id: 'sales-create',
        label: 'Sales Create',
        shortLabel: 'CS',
        link: '/sales/create',
        roles: MenuRoles.salesCreate,
      },
      {
        id: 'sales-invoices',
        label: 'Invoices',
        shortLabel: 'IN',
        link: '/sales/invoices',
        roles: MenuRoles.invoice,
      },
      {
        id: 'sales-due-collection',
        label: 'Due Collection',
        shortLabel: 'DC',
        link: '/sales/due-collection',
        roles: MenuRoles.dueCollection,
      },
      {
        id: 'sales-return',
        label: 'Sales Return',
        shortLabel: 'RT',
        link: '/sales/sales-return',
        roles: MenuRoles.salesReturn,
      },
      {
        id: 'sales-stock',
        label: 'Stock',
        shortLabel: 'SK',
        link: '/stores/stock',
        roles: MenuRoles.stock,
      },
    ],
  },
  {
    id: 'expenses',
    label: 'Expense',
    shortLabel: 'EX',
    link: '/expenses',
    roles: MenuRoles.expense,
  },
  {
    id: 'reconcile-stocks',
    label: 'Stock Reconcile',
    shortLabel: 'SR',
    expandedByDefault: false,
    children: [
      {
        id: 'reconcile-stocks-list',
        label: 'Reconcile List',
        shortLabel: 'RS',
        link: '/reconcile-stocks/list',
        roles: MenuRoles.reconcileStockList,
      },
      {
        id: 'reconcile-stocks-create',
        label: 'Reconcile Create',
        shortLabel: 'CR',
        link: '/reconcile-stocks/create',
        roles: MenuRoles.reconcileStockCreate,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Report',
    shortLabel: 'RP',
    expandedByDefault: false,
    children: [
      {
        id: 'items-barcode-generate',
        label: 'Barcode Generate',
        shortLabel: 'BG',
        link: '/items/barcode-generate',
        roles: MenuRoles.barcodeGenerate,
      },
      {
        id: 'reports-current-stock',
        label: 'Current Stock',
        shortLabel: 'CS',
        link: '/reports/current-stock',
        roles: MenuRoles.currentStockReport,
      },
      {
        id: 'reports-expired-stock',
        label: 'Expired Stock',
        shortLabel: 'ES',
        link: '/reports/expired-stock',
        roles: MenuRoles.expiredStockReport,
      },
      {
        id: 'reports-income-statement',
        label: 'Income Statement',
        shortLabel: 'IS',
        link: '/reports/income-statement',
        roles: MenuRoles.incomeStatementReport,
      },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    shortLabel: 'SE',
    expandedByDefault: false,
    children: [
      {
        id: 'setup-item',
        label: 'Item',
        shortLabel: 'IT',
        link: '/items',
        exact: true,
        roles: MenuRoles.item,
      },
      {
        id: 'setup-customer',
        label: 'Customer',
        shortLabel: 'CU',
        link: '/customers',
        roles: MenuRoles.customer,
      },
      {
        id: 'setup-supplier',
        label: 'Supplier',
        shortLabel: 'SU',
        link: '/suppliers',
        roles: MenuRoles.supplier,
      },
      {
        id: 'setup-store',
        label: 'Store',
        shortLabel: 'ST',
        link: '/stores',
        exact: true,
        roles: MenuRoles.store,
      },
      {
        id: 'setup-lookup',
        label: 'Lookup',
        shortLabel: 'LK',
        link: '/lookups',
        roles: MenuRoles.lookup,
      },
      {
        id: 'setup-financial-year',
        label: 'Financial Year',
        shortLabel: 'FY',
        link: '/financial-years',
        roles: MenuRoles.financialYear,
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    shortLabel: 'SC',
    expandedByDefault: false,
    requireAdmin: true,
    children: [
      {
        id: 'security-user-group',
        label: 'User Group',
        shortLabel: 'UG',
        link: '/user-groups',
        requireAdmin: true,
      },
      {
        id: 'security-user',
        label: 'User',
        shortLabel: 'US',
        link: '/users',
        requireAdmin: true,
      },
    ],
  },
];

export function canSeeMenuNode(node: SidebarMenuNode, access: AccessContext): boolean {
  if (node.requireAdmin) {
    return access.isAdmin;
  }
  if (access.isAdmin) {
    return true;
  }
  if (!node.roles?.length) {
    return true;
  }
  return node.roles.some((role) => access.roles.has(role));
}

/** Drop hidden leaves and empty parents according to JWT authority / roles. */
export function filterMenuByAccess(
  nodes: SidebarMenuNode[],
  access: AccessContext,
): SidebarMenuNode[] {
  const visible: SidebarMenuNode[] = [];
  for (const node of nodes) {
    if (node.requireAdmin && !access.isAdmin) {
      continue;
    }
    if (node.children?.length) {
      const children = filterMenuByAccess(node.children, access);
      if (children.length) {
        visible.push({ ...node, children });
      }
      continue;
    }
    if (canSeeMenuNode(node, access)) {
      visible.push(node);
    }
  }
  return visible;
}

/** Collect all ancestor ids that contain a matching link. */
export function findExpandedIdsForUrl(
  nodes: SidebarMenuNode[],
  url: string,
  ancestors: string[] = [],
): string[] {
  for (const node of nodes) {
    const path = ancestors.concat(node.id);
    if (node.link && urlMatches(url, node)) {
      return ancestors;
    }
    if (node.children?.length) {
      const hit = findExpandedIdsForUrl(node.children, url, path);
      if (hit.length) {
        return hit;
      }
    }
  }
  return [];
}

function urlMatches(url: string, node: SidebarMenuNode): boolean {
  const normalizedUrl = url.split('?')[0].replace(/\/$/, '') || '/';
  const normalizedLink = (node.link || '').replace(/\/$/, '') || '/';
  if (node.exact === true) {
    return normalizedUrl === normalizedLink;
  }
  return (
    normalizedUrl === normalizedLink ||
    normalizedUrl.startsWith(`${normalizedLink}/`)
  );
}

/** Default expanded ids from `expandedByDefault` flags. */
export function collectDefaultExpandedIds(
  nodes: SidebarMenuNode[],
  acc: string[] = [],
): string[] {
  for (const node of nodes) {
    if (node.children?.length && node.expandedByDefault) {
      acc.push(node.id);
    }
    if (node.children?.length) {
      collectDefaultExpandedIds(node.children, acc);
    }
  }
  return acc;
}
