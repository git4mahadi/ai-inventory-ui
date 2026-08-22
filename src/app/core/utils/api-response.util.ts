import { map, Observable } from 'rxjs';
import { ApiResponse } from '../models/Response';
import { Page } from '../models/Page';
import { CustomerResponse } from '../../models/response/CustomerResponse';
import { FinancialYearResponse } from '../../models/response/FinancialYearResponse';
import { StoreResponse } from '../../models/response/StoreResponse';
import { LookupResponse } from '../../models/response/LookupResponse';
import { SupplierResponse } from '../../models/response/SupplierResponse';

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
    return value as Page<T>;
  }

  const nested = value['data'];
  if (nested && typeof nested === 'object') {
    const data = nested as Record<string, unknown>;
    if (Array.isArray(data['content'])) {
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
