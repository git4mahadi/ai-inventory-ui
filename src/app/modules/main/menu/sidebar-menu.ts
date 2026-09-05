/**
 * Sidebar navigation tree.
 * Add / nest items here — the layout renders this structure dynamically.
 */
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
      },
      {
        id: 'opening-stocks-create',
        label: 'Opening Stock Create',
        shortLabel: 'OC',
        link: '/opening-stocks/create',
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
      },
      {
        id: 'purchase-orders-create',
        label: 'Purchase Order Create',
        shortLabel: 'PC',
        link: '/purchase-orders/create',
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
      },
      {
        id: 'receives-create',
        label: 'Receive Create',
        shortLabel: 'RC',
        link: '/receives/create',
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
      },
      {
        id: 'sales-create',
        label: 'Sales Create',
        shortLabel: 'CS',
        link: '/sales/create',
      },
      {
        id: 'sales-invoices',
        label: 'Invoices',
        shortLabel: 'IN',
        link: '/sales/invoices',
      },
      {
        id: 'sales-due-collection',
        label: 'Due Collection',
        shortLabel: 'DC',
        link: '/sales/due-collection',
      },
      {
        id: 'sales-return',
        label: 'Sales Return',
        shortLabel: 'RT',
        link: '/sales/sales-return',
      },
      {
        id: 'sales-stock',
        label: 'Stock',
        shortLabel: 'SK',
        link: '/stores/stock',
      },
    ],
  },
  {
    id: 'expenses',
    label: 'Expense',
    shortLabel: 'EX',
    link: '/expenses',
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
      },
      {
        id: 'reconcile-stocks-create',
        label: 'Reconcile Create',
        shortLabel: 'CR',
        link: '/reconcile-stocks/create',
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
      },
      {
        id: 'reports-current-stock',
        label: 'Current Stock',
        shortLabel: 'CS',
        link: '/reports/current-stock',
      },
      {
        id: 'reports-expired-stock',
        label: 'Expired Stock',
        shortLabel: 'ES',
        link: '/reports/expired-stock',
      },
      {
        id: 'reports-income-statement',
        label: 'Income Statement',
        shortLabel: 'IS',
        link: '/reports/income-statement',
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
      },
      {
        id: 'setup-customer',
        label: 'Customer',
        shortLabel: 'CU',
        link: '/customers',
      },
      {
        id: 'setup-supplier',
        label: 'Supplier',
        shortLabel: 'SU',
        link: '/suppliers',
      },
      {
        id: 'setup-store',
        label: 'Store',
        shortLabel: 'ST',
        link: '/stores',
        exact: true,
      },
      {
        id: 'setup-lookup',
        label: 'Lookup',
        shortLabel: 'LK',
        link: '/lookups',
      },
      {
        id: 'setup-financial-year',
        label: 'Financial Year',
        shortLabel: 'FY',
        link: '/financial-years',
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    shortLabel: 'SC',
    expandedByDefault: false,
    children: [
      {
        id: 'security-user-group',
        label: 'User Group',
        shortLabel: 'UG',
        link: '/user-groups',
      },
      {
        id: 'security-user',
        label: 'User',
        shortLabel: 'US',
        link: '/users',
      },
    ],
  },
];

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
