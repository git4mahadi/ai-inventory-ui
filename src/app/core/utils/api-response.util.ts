import { map, Observable } from 'rxjs';
import { ApiResponse } from '../models/Response';
import { Page } from '../models/Page';
import { CustomerResponse } from '../../models/response/CustomerResponse';
import { ExpenseResponse } from '../../models/response/ExpenseResponse';
import { FinancialYearResponse } from '../../models/response/FinancialYearResponse';
import { StoreResponse } from '../../models/response/StoreResponse';
import { ItemResponse } from '../../models/response/ItemResponse';
import { LookupResponse } from '../../models/response/LookupResponse';
import { OpeningStockResponse } from '../../models/response/OpeningStockResponse';
import { PurchaseOrderResponse } from '../../models/response/PurchaseOrderResponse';
import { ReceiveResponse } from '../../models/response/ReceiveResponse';
import { ReconcileStockResponse } from '../../models/response/ReconcileStockResponse';
import { SalesResponse } from '../../models/response/SalesResponse';
import { SummaryResponseV1 } from '../../models/response/SummaryResponseV1';
import { SupplierResponse } from '../../models/response/SupplierResponse';
import { UserGroupResponse } from '../../models/response/UserGroupResponse';

/** Unwraps `{ data: T }` API envelopes; passes through if already unwrapped. */
export function unwrapApiData<T>() {
  return (source: Observable<ApiResponse<T> | T>): Observable<T> =>
    source.pipe(
      map((response) => {
        if (isApiEnvelope<T>(response)) {
          return response.data;
        }
        return response as T;
      }),
    );
}

export function normalizePage<T>(result: unknown): Page<T> {
  if (!result || typeof result !== 'object') {
    return { content: [], totalElements: 0, totalPages: 0, number: 0 };
  }

  const value = result as Record<string, unknown>;

  if (Array.isArray(value['content'])) {
    const nestedPage = value['page'];
    if (nestedPage && typeof nestedPage === 'object') {
      const pagination = nestedPage as Record<string, unknown>;
      return {
        ...(value as Page<T>),
        size: pagination['size'] as number | undefined,
        number: pagination['number'] as number | undefined,
        totalElements: pagination['totalElements'] as number | undefined,
        totalPages: pagination['totalPages'] as number | undefined,
      };
    }
    return value as Page<T>;
  }

  const nested = value['data'];
  if (nested && typeof nested === 'object') {
    const data = nested as Record<string, unknown>;
    if (Array.isArray(data['content'])) {
      const nestedPage = data['page'];
      if (nestedPage && typeof nestedPage === 'object') {
        const pagination = nestedPage as Record<string, unknown>;
        return {
          ...(data as Page<T>),
          size: pagination['size'] as number | undefined,
          number: pagination['number'] as number | undefined,
          totalElements: pagination['totalElements'] as number | undefined,
          totalPages: pagination['totalPages'] as number | undefined,
        };
      }
      return data as Page<T>;
    }
    if (Array.isArray(nested)) {
      return {
        content: nested as T[],
        totalElements: (nested as T[]).length,
        totalPages: 1,
        number: 0,
      };
    }
  }

  if (Array.isArray(result)) {
    return {
      content: result as T[],
      totalElements: (result as T[]).length,
      totalPages: 1,
      number: 0,
    };
  }

  return { content: [], totalElements: 0, totalPages: 0, number: 0 };
}

/** Resolves a customer entity from a raw or `{ data: customer }` payload. */
export function normalizeCustomer(payload: unknown): CustomerResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'customerName' in value ||
    'mobile' in value ||
    'email' in value ||
    'address' in value ||
    'id' in value
  ) {
    return value as CustomerResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeCustomer(value['data']);
  }

  return null;
}

/** Resolves a store entity from a raw or `{ data: store }` payload. */
export function normalizeStore(payload: unknown): StoreResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'storeName' in value ||
    'storeCode' in value ||
    'mobile' in value ||
    'address' in value ||
    'isMain' in value ||
    'id' in value
  ) {
    return value as StoreResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeStore(value['data']);
  }

  return null;
}

/** Resolves a financial year entity from a raw or `{ data: financialYear }` payload. */
export function normalizeFinancialYear(
  payload: unknown,
): FinancialYearResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'fyCode' in value ||
    'startDate' in value ||
    'endDate' in value ||
    'isCurrent' in value ||
    'description' in value ||
    'id' in value
  ) {
    return value as FinancialYearResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeFinancialYear(value['data']);
  }

  return null;
}

/** Resolves a supplier entity from a raw or `{ data: supplier }` payload. */
export function normalizeSupplier(payload: unknown): SupplierResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'supplierName' in value ||
    'tin' in value ||
    'bin' in value ||
    'tradeLicense' in value ||
    'contactPersonName' in value ||
    'supplierTypeEnumKey' in value ||
    'mobile' in value ||
    'email' in value ||
    'address' in value ||
    'id' in value
  ) {
    return value as SupplierResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeSupplier(value['data']);
  }

  return null;
}

/** Resolves an item entity from a raw or `{ data: item }` payload. */
export function normalizeItem(payload: unknown): ItemResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'itemName' in value ||
    'itemCode' in value ||
    'itemBarcode' in value ||
    'strength' in value ||
    'storeId' in value ||
    'purchaseRate' in value ||
    'salesRate' in value ||
    'id' in value
  ) {
    return value as ItemResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeItem(value['data']);
  }

  return null;
}

/** Resolves an expense entity from a raw or `{ data: expense }` payload. */
export function normalizeExpense(payload: unknown): ExpenseResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'expenseDate' in value ||
    'expenseHeadId' in value ||
    'expenseHeadName' in value ||
    'amount' in value ||
    'remarks' in value ||
    'id' in value
  ) {
    return value as ExpenseResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeExpense(value['data']);
  }

  return null;
}

/** Resolves an opening stock entity from a raw or `{ data: openingStock }` payload. */
export function normalizeOpeningStock(
  payload: unknown,
): OpeningStockResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'openingStockNcId' in value ||
    'challanNo' in value ||
    'challanDate' in value ||
    'financialYearId' in value ||
    'fyCode' in value ||
    ('storeId' in value && 'items' in value)
  ) {
    return value as OpeningStockResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeOpeningStock(value['data']);
  }

  return null;
}

/** Resolves a purchase order entity from a raw or `{ data: purchaseOrder }` payload. */
export function normalizePurchaseOrder(
  payload: unknown,
): PurchaseOrderResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'orderNcId' in value ||
    'orderDate' in value ||
    'orderStatus' in value ||
    'grandTotal' in value ||
    ('storeId' in value && 'supplierId' in value)
  ) {
    return value as PurchaseOrderResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizePurchaseOrder(value['data']);
  }

  return null;
}

/** Resolves a receive entity from a raw or `{ data: receive }` payload. */
export function normalizeReceive(payload: unknown): ReceiveResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'receiveNcId' in value ||
    'receiveDate' in value ||
    'receiveStatus' in value ||
    'purchaseOrderId' in value
  ) {
    return value as ReceiveResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeReceive(value['data']);
  }

  return null;
}

/** Resolves a reconcile stock entity from a raw or `{ data: reconcileStock }` payload. */
export function normalizeReconcileStock(
  payload: unknown,
): ReconcileStockResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'reconcileStockNcId' in value ||
    'reconcileDate' in value ||
    ('storeId' in value && 'items' in value)
  ) {
    return value as ReconcileStockResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeReconcileStock(value['data']);
  }

  return null;
}

/** Resolves a sales entity from a raw or `{ data: sales }` payload. */
export function normalizeSales(payload: unknown): SalesResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'invoiceNcId' in value ||
    'salesDate' in value ||
    'salesStatus' in value ||
    'totalAmount' in value
  ) {
    return value as SalesResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeSales(value['data']);
  }

  return null;
}

/** Resolves a dashboard summary v1 payload from a raw or `{ data }` envelope. */
export function normalizeSummaryV1(payload: unknown): SummaryResponseV1 | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'totalSales' in value ||
    'totalCollection' in value ||
    'totalDue' in value ||
    'totalStock' in value
  ) {
    return value as SummaryResponseV1;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeSummaryV1(value['data']);
  }

  return null;
}

/** Resolves a user group entity from a raw or `{ data: userGroup }` payload. */
export function normalizeUserGroup(payload: unknown): UserGroupResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'groupName' in value ||
    'permissions' in value ||
    ('id' in value && ('enabled' in value || 'isDeleted' in value))
  ) {
    return {
      ...(value as UserGroupResponse),
      permissions: normalizePermissionList(value['permissions']),
    };
  }

  if ('data' in value && value['data'] != null) {
    return normalizeUserGroup(value['data']);
  }

  return null;
}

function normalizePermissionList(raw: unknown): string[] {
  let value: unknown = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (typeof record['name'] === 'string') {
          return record['name'];
        }
      }
      return '';
    })
    .filter((role) => !!role);
}

/** Resolves a lookup entity from a raw or `{ data: lookup }` payload. */
export function normalizeLookup(payload: unknown): LookupResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;

  if (
    'lookupName' in value ||
    'lookupShortName' in value ||
    'lookupEnumKey' in value ||
    'lookupEnumValue' in value ||
    'parentId' in value ||
    'parentFullName' in value ||
    'id' in value
  ) {
    return value as LookupResponse;
  }

  if ('data' in value && value['data'] != null) {
    return normalizeLookup(value['data']);
  }

  return null;
}

function isApiEnvelope<T>(value: unknown): value is ApiResponse<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    'data' in value &&
    (value as ApiResponse<T>).data !== undefined
  );
}
