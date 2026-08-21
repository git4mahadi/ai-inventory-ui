export class CustomerResponse {
  id?: string;
  customerName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  enabled?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  createdById?: string;
  lastModifiedAt?: string;
  lastModifiedById?: string | null;
}
