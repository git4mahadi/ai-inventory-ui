import { Pageable } from './Pageable';

export interface Page<T> {
  content?: T[];
  empty?: boolean;
  first?: boolean;
  last?: boolean;
  number?: number;
  numberOfElements?: number;
  pageable?: Pageable;
  size?: number;
  sort?: string | unknown;
  totalPages?: number;
  totalElements?: number;
}
