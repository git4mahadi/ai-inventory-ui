import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';

/** Pass to `[modules]` on `ag-grid-angular` so modules register on the grid instance. */
export const appGridModules = [AllCommunityModule];

let agGridModulesRegistered = false;

/** Register AG Grid modules globally (backup for grids without `[modules]`). */
export function registerAgGridModules(): void {
  if (agGridModulesRegistered) {
    return;
  }
  ModuleRegistry.registerModules(appGridModules);
  agGridModulesRegistered = true;
}

export const appGridTheme = themeQuartz.withParams({
  accentColor: '#2a9d6a',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(18, 53, 40, 0.08)',
  borderRadius: 0,
  cellTextColor: '#123528',
  dataBackgroundColor: '#ffffff',
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  headerBackgroundColor: '#eef6f1',
  headerFontWeight: 700,
  headerTextColor: '#176643',
  oddRowBackgroundColor: 'rgba(241, 248, 244, 0.4)',
  rowBorder: { color: 'rgba(18, 53, 40, 0.05)' },
  rowHoverColor: 'rgba(42, 157, 106, 0.07)',
});

export const appGridDefaultColDef: ColDef = {
  sortable: false,
  filter: false,
  resizable: true,
  suppressMovable: true,
};
