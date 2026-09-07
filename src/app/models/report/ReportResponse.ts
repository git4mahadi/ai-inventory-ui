import { StoreResponse } from '../response/StoreResponse';

export class ReportResponse<T> {
  store?: StoreResponse;
  data?: T[];
  map?: Record<string, unknown>;
}
