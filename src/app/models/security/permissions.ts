/**
 * Permission tree aligned with UserRoles.java.
 * Parent nodes match controller comments; leaves are role enum names.
 */
export interface PermissionNode {
  /** Unique key used for expand/collapse state */
  id: string;
  label: string;
  /** Compact label, same idea as the sidebar */
  shortLabel?: string;
  /** UserRoles enum constant name; set on leaves only */
  role?: string;
  children?: PermissionNode[];
  expandedByDefault?: boolean;
}

const CRUD_SEARCH = [
  ['CREATE', 'Create'],
  ['UPDATE', 'Update'],
  ['DELETE', 'Delete'],
  ['SEARCH_PAGE', 'Search page'],
  ['SEARCH_LIST', 'Search list'],
  ['SEARCH_TERM', 'Search term'],
] as const;

const CRUD_READ_SEARCH = [
  ['CREATE', 'Create'],
  ['UPDATE', 'Update'],
  ['DELETE', 'Delete'],
  ['READ', 'Read'],
  ['SEARCH_PAGE', 'Search page'],
  ['SEARCH_LIST', 'Search list'],
  ['SEARCH_TERM', 'Search term'],
] as const;

function leaf(role: string, label: string): PermissionNode {
  return { id: role, label, role };
}

function prefixed(
  prefix: string,
  actions: ReadonlyArray<readonly [string, string]>,
): PermissionNode[] {
  return actions.map(([action, label]) => leaf(`${prefix}_${action}`, label));
}

function node(
  id: string,
  label: string,
  shortLabel: string,
  children: PermissionNode[],
): PermissionNode {
  return { id, label, shortLabel, children };
}

export const PERMISSION_TREE: PermissionNode[] = [
  node('system', 'System', 'SY', [
    leaf('ROLE_SUPER_ADMIN', 'Super admin'),
    leaf('ROLE_ADMIN', 'Admin'),
    leaf('ROLE_USER', 'User'),
  ]),
  node('customer', 'Customer', 'CU', prefixed('ROLE_CUSTOMER', CRUD_READ_SEARCH)),
  node('expense', 'Expense', 'EX', prefixed('ROLE_EXPENSE', CRUD_READ_SEARCH)),
  node(
    'financial-year',
    'Financial Year',
    'FY',
    prefixed('ROLE_FINANCIAL_YEAR', CRUD_READ_SEARCH),
  ),
  node('invoice', 'Invoice', 'IN', [
    leaf('ROLE_INVOICE_READ', 'Read'),
    leaf('ROLE_INVOICE_SEARCH_PAGE', 'Search page'),
    leaf('ROLE_INVOICE_SEARCH_LIST', 'Search list'),
    leaf('ROLE_INVOICE_SEARCH_TERM', 'Search term'),
    leaf('ROLE_INVOICE_DUE_COLLECTION', 'Due collection'),
  ]),
  node('item', 'Item', 'IT', [
    ...prefixed('ROLE_ITEM', CRUD_SEARCH),
    leaf('ROLE_ITEM_SEARCH_TERM_STOCK', 'Search term stock'),
  ]),
  node('lookup', 'Lookup', 'LK', prefixed('ROLE_LOOKUP', CRUD_READ_SEARCH)),
  node(
    'opening-stock',
    'Opening Stock',
    'OS',
    prefixed('ROLE_OPENING_STOCK', CRUD_READ_SEARCH),
  ),
  node(
    'purchase-order',
    'Purchase Order',
    'PO',
    prefixed('ROLE_PURCHASE_ORDER', CRUD_READ_SEARCH),
  ),
  node('receive', 'Receive', 'RC', prefixed('ROLE_RECEIVE', CRUD_READ_SEARCH)),
  node(
    'reconcile-stock',
    'Reconcile Stock',
    'RS',
    prefixed('ROLE_RECONCILE_STOCK', CRUD_READ_SEARCH),
  ),
  node('report', 'Report', 'RP', [
    leaf('ROLE_CURRENT_STOCK_REPORT', 'Current stock'),
    leaf('ROLE_CURRENT_EXPIRED_STOCK_REPORT', 'Expired stock'),
    leaf('ROLE_INCOME_STATEMENT_REPORT', 'Income statement'),
  ]),
  node('return', 'Return', 'RT', [
    leaf('ROLE_RETURN_CREATE_SALES', 'Create sales'),
    leaf('ROLE_RETURN_UPDATE', 'Update'),
    leaf('ROLE_RETURN_DELETE', 'Delete'),
    leaf('ROLE_RETURN_READ', 'Read'),
    leaf('ROLE_RETURN_SEARCH_PAGE', 'Search page'),
    leaf('ROLE_RETURN_SEARCH_LIST', 'Search list'),
    leaf('ROLE_RETURN_SEARCH_TERM', 'Search term'),
  ]),
  node('sales', 'Sales', 'SL', prefixed('ROLE_SALES', CRUD_READ_SEARCH)),
  node('stock', 'Stock', 'SK', [leaf('ROLE_STOCK_SEARCH_PAGE', 'Search page')]),
  node('store', 'Store', 'ST', prefixed('ROLE_STORE', CRUD_READ_SEARCH)),
  node('supplier', 'Supplier', 'SU', prefixed('ROLE_SUPPLIER', CRUD_READ_SEARCH)),
  node('user', 'User', 'US', prefixed('ROLE_USER', CRUD_READ_SEARCH)),
  node('user-group', 'User Group', 'UG', prefixed('ROLE_USER_GROUP', CRUD_SEARCH)),
  node(
    'user-group-assign',
    'User Group Assign',
    'UA',
    prefixed('ROLE_USER_GROUP_ASSIGN', CRUD_SEARCH),
  ),
];

export function collectNodeRoles(node: PermissionNode): string[] {
  if (node.role) {
    return [node.role];
  }
  return (node.children ?? []).flatMap(collectNodeRoles);
}

export function collectAllPermissionRoles(
  nodes: PermissionNode[] = PERMISSION_TREE,
): string[] {
  return nodes.flatMap(collectNodeRoles);
}

export function collectDefaultExpandedPermissionIds(
  nodes: PermissionNode[],
  acc: string[] = [],
): string[] {
  for (const node of nodes) {
    if (node.children?.length && node.expandedByDefault) {
      acc.push(node.id);
    }
    if (node.children?.length) {
      collectDefaultExpandedPermissionIds(node.children, acc);
    }
  }
  return acc;
}

export const ALL_PERMISSION_ROLES = collectAllPermissionRoles();
