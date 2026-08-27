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
    id: 'customers',
    label: 'Customers',
    shortLabel: 'CU',
    expandedByDefault: false,
    children: [
      {
        id: 'customers-list',
        label: 'Customer List',
        shortLabel: 'CL',
        link: '/customers/list',
        children: [],
      },
      {
        id: 'customers-create',
        label: 'Customer Create',
        shortLabel: 'CC',
        link: '/customers/create',
      },
    ],
  },
  {
    id: 'stores',
    label: 'Stores',
    shortLabel: 'ST',
    expandedByDefault: false,
    children: [
      {
        id: 'stores-list',
        label: 'Store List',
        shortLabel: 'SL',
        link: '/stores/list',
      },
      {
        id: 'stores-create',
        label: 'Store Create',
        shortLabel: 'SC',
        link: '/stores/create',
      },
      {
        id: 'stores-stock',
        label: 'Stock',
        shortLabel: 'SK',
        link: '/stores/stock',
      },
    ],
  },
  {
    id: 'financial-years',
    label: 'Financial Years',
    shortLabel: 'FY',
    expandedByDefault: false,
    children: [
      {
        id: 'financial-years-list',
        label: 'FY List',
        shortLabel: 'FL',
        link: '/financial-years/list',
      },
      {
        id: 'financial-years-create',
        label: 'FY Create',
        shortLabel: 'FC',
        link: '/financial-years/create',
      },
    ],
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    shortLabel: 'SU',
    expandedByDefault: false,
    children: [
      {
        id: 'suppliers-list',
        label: 'Supplier List',
        shortLabel: 'SL',
        link: '/suppliers/list',
      },
      {
        id: 'suppliers-create',
        label: 'Supplier Create',
        shortLabel: 'SC',
        link: '/suppliers/create',
      },
    ],
  },
  {
    id: 'lookups',
    label: 'Lookups',
    shortLabel: 'LK',
    expandedByDefault: false,
    children: [
      {
        id: 'lookups-list',
        label: 'Lookup List',
        shortLabel: 'LL',
        link: '/lookups/list',
      },
      {
        id: 'lookups-create',
        label: 'Lookup Create',
        shortLabel: 'LC',
        link: '/lookups/create',
      },
    ],
  },
  {
    id: 'items',
    label: 'Items',
    shortLabel: 'IT',
    expandedByDefault: false,
    children: [
      {
        id: 'items-list',
        label: 'Item List',
        shortLabel: 'IL',
        link: '/items/list',
      },
      {
        id: 'items-create',
        label: 'Item Create',
        shortLabel: 'IC',
        link: '/items/create',
      },
    ],
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
        label: 'Sales list',
        shortLabel: 'LS',
        link: '/sales/list',
      },
      {
        id: 'sales-create',
        label: 'Create sale',
        shortLabel: 'CS',
        link: '/sales/create',
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
    if (node.link && urlStartsWith(url, node.link)) {
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

function urlStartsWith(url: string, link: string): boolean {
  const normalizedUrl = url.split('?')[0].replace(/\/$/, '') || '/';
  const normalizedLink = link.replace(/\/$/, '') || '/';
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
