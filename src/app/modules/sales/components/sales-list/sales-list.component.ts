import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AllCommunityModule, ColDef, ModuleRegistry } from 'ag-grid-community';
import { SaleItem } from '../../models/sale-item.model';
import { SalesService } from '../../services/sales.service';
import { formatToBdNumberingSystem } from '../../../../core/utils/bd-number.util';
import { appGridDefaultColDef, appGridTheme } from '../../../../shared/utils/ag-grid.util';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-sales-list',
  standalone: false,
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit, OnDestroy {
  readonly columnDefs: ColDef<SaleItem>[] = [
    {
      field: 'soldAt',
      headerName: 'Date',
      flex: 0.9,
      minWidth: 125,
      valueFormatter: (params) => (params.node?.rowPinned ? '' : this.formatDate(params.value)),
    },
    {
      field: 'itemName',
      headerName: 'Item',
      flex: 1.3,
      minWidth: 160,
      cellClass: 'item-name',
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 1.1,
      minWidth: 145,
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      flex: 0.7,
      minWidth: 85,
      cellClass: 'cell-mono text-end',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'unitPrice',
      headerName: 'Unit price',
      flex: 0.9,
      minWidth: 115,
      cellClass: 'cell-mono text-end',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      colId: 'total',
      headerName: 'Total',
      flex: 0.9,
      minWidth: 115,
      cellClass: 'cell-mono text-end',
      valueGetter: (params) => (params.node?.rowPinned ? this.getGrandTotal() : params.data ? this.getTotal(params.data) : 0),
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      tooltipField: 'notes',
      valueFormatter: (params) => params.value || '—',
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  sales: SaleItem[] = [];
  grandTotalRow: SaleItem[] = [];
  private subscription?: Subscription;

  constructor(private readonly salesService: SalesService) {}

  ngOnInit(): void {
    this.subscription = this.salesService.sales$.subscribe((sales) => {
      this.sales = sales;
      this.grandTotalRow = [
        {
          id: 'grand-total',
          itemName: 'Grand total',
          quantity: 0,
          unitPrice: 0,
          customerName: '',
          soldAt: '',
        },
      ];
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getTotal(sale: SaleItem): number {
    return this.salesService.getTotal(sale);
  }

  getGrandTotal(): number {
    return this.sales.reduce((sum, sale) => sum + this.getTotal(sale), 0);
  }

  private formatDate(value: string | undefined): string {
    return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)) : '—';
  }

  private formatNumber(value: number | undefined): string {
    return value == null ? '—' : formatToBdNumberingSystem(value);
  }
}
