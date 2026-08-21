export class StoreResponse {
  id?: string;
  storeName?: string;
  storeCode?: string;
  mobile?: string;
  address?: string;
  isMain?: boolean;
  enabled?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  createdById?: string;
  lastModifiedAt?: string;
  lastModifiedById?: string | null;
}
