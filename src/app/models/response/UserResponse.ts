import { UserGroupResponse } from './UserGroupResponse';

export class UserResponse {
  id?: string;
  username?: string;
  fullName?: string;
  authority?: string;
  isAccountExpired?: boolean;
  isAccountLocked?: boolean;
  isCredentialExpired?: boolean;
  isAccountEnabled?: boolean;
  createdByUsername?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  roles?: string[];
  groups?: UserGroupResponse[];
}
