export class UserGroupResponse {
  id?: string;
  groupName?: string;
  permissions?: string[];
  enabled?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  createdById?: string;
  lastModifiedAt?: string;
  lastModifiedById?: string | null;
}
