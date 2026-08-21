export interface ApiResponse<T> {
  timestamp?: string;
  success?: boolean;
  status?: number;
  message?: string;
  data: T;
}
