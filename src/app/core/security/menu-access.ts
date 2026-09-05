/** Role lists used by the sidebar and route guards. Any listed role grants access. */

export interface AccessContext {
  isAdmin: boolean;
  authority?: string;
  roles: ReadonlySet<string>;
}

function roles(prefix: string, actions: string[]): string[] {
  return actions.map((action) => `${prefix}_${action}`);
}

const SEARCH = ['SEARCH_PAGE', 'SEARCH_LIST', 'SEARCH_TERM', 'READ'];
const CREATE = ['CREATE'];
const UPDATE = ['UPDATE', 'READ'];
const CRUD = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'READ',
  'SEARCH_PAGE',
  'SEARCH_LIST',
  'SEARCH_TERM',
];

export const MenuRoles = {
  openingStockList: roles('ROLE_OPENING_STOCK', SEARCH),
  openingStockCreate: roles('ROLE_OPENING_STOCK', CREATE),
  openingStockEdit: roles('ROLE_OPENING_STOCK', UPDATE),
  openingStockAny: roles('ROLE_OPENING_STOCK', CRUD),

  purchaseOrderList: roles('ROLE_PURCHASE_ORDER', SEARCH),
  purchaseOrderCreate: roles('ROLE_PURCHASE_ORDER', CREATE),
  purchaseOrderEdit: roles('ROLE_PURCHASE_ORDER', UPDATE),
  purchaseOrderAny: roles('ROLE_PURCHASE_ORDER', CRUD),

  receiveList: roles('ROLE_RECEIVE', SEARCH),
  receiveCreate: roles('ROLE_RECEIVE', CREATE),
  receiveEdit: roles('ROLE_RECEIVE', UPDATE),
  receiveAny: roles('ROLE_RECEIVE', CRUD),

  salesList: roles('ROLE_SALES', SEARCH),
  salesCreate: roles('ROLE_SALES', CREATE),
  salesEdit: roles('ROLE_SALES', UPDATE),
  salesAny: roles('ROLE_SALES', CRUD),

  invoice: [
    'ROLE_INVOICE_READ',
    'ROLE_INVOICE_SEARCH_PAGE',
    'ROLE_INVOICE_SEARCH_LIST',
    'ROLE_INVOICE_SEARCH_TERM',
  ],
  dueCollection: ['ROLE_INVOICE_DUE_COLLECTION'],
  salesReturn: [
    'ROLE_RETURN_CREATE_SALES',
    'ROLE_RETURN_UPDATE',
    'ROLE_RETURN_DELETE',
    'ROLE_RETURN_READ',
    'ROLE_RETURN_SEARCH_PAGE',
    'ROLE_RETURN_SEARCH_LIST',
    'ROLE_RETURN_SEARCH_TERM',
  ],
  stock: ['ROLE_STOCK_SEARCH_PAGE'],

  expense: roles('ROLE_EXPENSE', CRUD),

  reconcileStockList: roles('ROLE_RECONCILE_STOCK', SEARCH),
  reconcileStockCreate: roles('ROLE_RECONCILE_STOCK', CREATE),
  reconcileStockAny: roles('ROLE_RECONCILE_STOCK', CRUD),

  item: [
    ...roles('ROLE_ITEM', [
      'CREATE',
      'UPDATE',
      'DELETE',
      'SEARCH_PAGE',
      'SEARCH_LIST',
      'SEARCH_TERM',
    ]),
    'ROLE_ITEM_SEARCH_TERM_STOCK',
  ],
  barcodeGenerate: [
    'ROLE_ITEM_SEARCH_PAGE',
    'ROLE_ITEM_SEARCH_LIST',
    'ROLE_ITEM_SEARCH_TERM',
  ],
  currentStockReport: ['ROLE_CURRENT_STOCK_REPORT'],
  expiredStockReport: ['ROLE_CURRENT_EXPIRED_STOCK_REPORT'],
  incomeStatementReport: ['ROLE_INCOME_STATEMENT_REPORT'],

  customer: roles('ROLE_CUSTOMER', CRUD),
  supplier: roles('ROLE_SUPPLIER', CRUD),
  store: roles('ROLE_STORE', CRUD),
  lookup: roles('ROLE_LOOKUP', CRUD),
  financialYear: roles('ROLE_FINANCIAL_YEAR', CRUD),
} as const;

export const SALES_MODULE_ROLES: string[] = [
  ...MenuRoles.salesAny,
  ...MenuRoles.invoice,
  ...MenuRoles.dueCollection,
  ...MenuRoles.salesReturn,
];

export const STORES_MODULE_ROLES: string[] = [...MenuRoles.store, ...MenuRoles.stock];

export const ITEMS_MODULE_ROLES: string[] = [...MenuRoles.item, ...MenuRoles.barcodeGenerate];

export const REPORTS_MODULE_ROLES: string[] = [
  ...MenuRoles.currentStockReport,
  ...MenuRoles.expiredStockReport,
  ...MenuRoles.incomeStatementReport,
];
