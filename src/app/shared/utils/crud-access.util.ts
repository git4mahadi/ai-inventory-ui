import { ColDef } from 'ag-grid-community';
import { AuthService } from '../../core/services/auth.service';

export interface CrudAccess {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function crudAccess(
  auth: AuthService,
  rolePrefix: string,
  overrides?: Partial<{ create: string; update: string; delete: string }>,
): CrudAccess {
  return {
    canCreate: auth.can(overrides?.create ?? `${rolePrefix}_CREATE`),
    canUpdate: auth.can(overrides?.update ?? `${rolePrefix}_UPDATE`),
    canDelete: auth.can(overrides?.delete ?? `${rolePrefix}_DELETE`),
  };
}

export function hideActionsColumnIfNeeded<T>(
  columnDefs: ColDef<T>[],
  access: Pick<CrudAccess, 'canUpdate' | 'canDelete'>,
  extraVisible = false,
): void {
  const col = columnDefs.find((def) => def.colId === 'actions');
  if (col) {
    col.hide = !access.canUpdate && !access.canDelete && !extraVisible;
  }
}

export function renderCrudActionButtons(options: {
  canUpdate?: boolean;
  canDelete?: boolean;
  deleting?: boolean;
  entityLabel: string;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  extraBefore?: string;
  extraAfter?: string;
}): string {
  const parts: string[] = [];
  if (options.extraBefore) {
    parts.push(options.extraBefore);
  }
  if (options.canUpdate) {
    parts.push(`
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit ${options.entityLabel}">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>`);
  }
  if (options.canDelete) {
    const deleteContent = options.deleting
      ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
      : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';
    const title = options.deleteTitle ?? 'Delete';
    const disabled = options.deleteDisabled || options.deleting ? ' disabled' : '';
    parts.push(`
        <button type="button" class="icon-action icon-delete" data-action="delete" title="${title}" aria-label="Delete ${options.entityLabel}"${disabled}>
          ${deleteContent}
        </button>`);
  }
  if (options.extraAfter) {
    parts.push(options.extraAfter);
  }
  if (!parts.length) {
    return '';
  }
  return `<div class="row-actions">${parts.join('')}</div>`;
}
