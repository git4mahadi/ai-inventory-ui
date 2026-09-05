import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { formatToBdNumberingSystem } from '../../../../core/utils/bd-number.util';
import { toApiDate, toDatePickerValue, toDisplayDate, toOrdinalDisplayDate } from '../../../../core/utils/date.util';
import { InvoiceCountPointResponse } from '../../../../models/response/InvoiceCountPointResponse';
import { SalesTrendPointResponse } from '../../../../models/response/SalesTrendPointResponse';
import { StoreResponse } from '../../../../models/response/StoreResponse';
import { SummaryResponseV1 } from '../../../../models/response/SummaryResponseV1';
import { DashboardSummarySearchDto } from '../../../../models/search/DashboardSummarySearchDto';
import { StoreSearchDto } from '../../../../models/search/StoreSearchDto';
import { DashboardApiService } from '../../../../services/DashboardApiService';
import { StoreApiService } from '../../../../services/StoreApiService';

type SummaryTone = 'green' | 'teal' | 'amber' | 'rose';

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  tone: SummaryTone;
  icon: 'revenue' | 'week' | 'due' | 'count';
}

interface RevenueTrendChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  tooltip: ApexTooltip;
  legend: ApexLegend;
}

interface InvoiceCountChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  tooltip: ApexTooltip;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: false,
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  loading = true;
  loadingInvoiceCount = true;
  loadingStores = false;
  loadingSummary = false;
  submitted = false;
  storeOptions: StoreResponse[] = [];
  summaryCards: SummaryCard[] = this.emptySummaryCards();
  revenueTrendChart: RevenueTrendChart | null = null;
  invoiceCountChart: InvoiceCountChart | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dashboardApi: DashboardApiService,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      startDate: [this.defaultStartDate(), Validators.required],
      endDate: [this.defaultEndDate(), Validators.required],
    });
  }

  get f() {
    return this.searchForm.controls;
  }

  ngOnInit(): void {
    this.loadStores();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  onSearch(): void {
    this.submitted = true;
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const startDate = toApiDate(this.searchForm.get('startDate')?.value);
    const endDate = toApiDate(this.searchForm.get('endDate')?.value);
    if (startDate && endDate && startDate > endDate) {
      this.toastr.error('Start date cannot be after end date');
      return;
    }

    this.loadDashboard();
  }

  onReset(): void {
    this.submitted = false;
    this.searchForm.reset({
      storeId: this.defaultStoreId(),
      startDate: this.defaultStartDate(),
      endDate: this.defaultEndDate(),
    });
    this.loadDashboard();
  }

  private loadStores(): void {
    this.loadingStores = true;
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .pipe(finalize(() => (this.loadingStores = false)))
      .subscribe({
        next: (stores) => {
          this.storeOptions = stores ?? [];
          const defaultStoreId = this.defaultStoreId();
          if (defaultStoreId && !this.searchForm.get('storeId')?.value) {
            this.searchForm.patchValue({ storeId: defaultStoreId });
          }
          this.loadDashboard();
        },
        error: () => {
          this.loading = false;
          this.loadingInvoiceCount = false;
          this.summaryCards = this.emptySummaryCards('Failed to load stores');
          this.revenueTrendChart = this.buildRevenueTrendChart([]);
          this.invoiceCountChart = this.buildInvoiceCountChart([]);
        },
      });
  }

  private loadDashboard(): void {
    this.loadSummary();
    this.loadSalesTrend();
    this.loadInvoiceCount();
  }

  private searchFilter(): DashboardSummarySearchDto | null {
    const storeId = this.searchForm.get('storeId')?.value as string | null;
    const startDate = toApiDate(this.searchForm.get('startDate')?.value);
    const endDate = toApiDate(this.searchForm.get('endDate')?.value);
    if (!storeId || !startDate || !endDate || startDate > endDate) {
      return null;
    }
    return new DashboardSummarySearchDto({ storeId, startDate, endDate });
  }

  private loadSummary(): void {
    const search = this.searchFilter();
    if (!search) {
      const startDate = toApiDate(this.searchForm.get('startDate')?.value);
      const endDate = toApiDate(this.searchForm.get('endDate')?.value);
      if (startDate && endDate && startDate > endDate) {
        this.summaryCards = this.emptySummaryCards('Start date cannot be after end date');
      } else {
        this.summaryCards = this.emptySummaryCards('Select store and date range');
      }
      return;
    }

    this.loadingSummary = true;
    this.dashboardApi
      .getSummary1(search)
      .pipe(finalize(() => (this.loadingSummary = false)))
      .subscribe({
        next: (summary) => this.applySummary(summary),
        error: () => {
          this.summaryCards = this.emptySummaryCards('Failed to load summary');
        },
      });
  }

  private loadSalesTrend(): void {
    const search = this.searchFilter();
    if (!search) {
      this.revenueTrendChart = this.buildRevenueTrendChart([]);
      this.loading = false;
      return;
    }

    this.loading = true;
    this.dashboardApi
      .getSalesTrend(search)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (points) => {
          this.revenueTrendChart = this.buildRevenueTrendChart(points);
        },
        error: () => {
          this.revenueTrendChart = this.buildRevenueTrendChart([]);
        },
      });
  }

  private loadInvoiceCount(): void {
    const search = this.searchFilter();
    if (!search) {
      this.invoiceCountChart = this.buildInvoiceCountChart([]);
      this.loadingInvoiceCount = false;
      return;
    }

    this.loadingInvoiceCount = true;
    this.dashboardApi
      .getInvoiceCount(search)
      .pipe(finalize(() => (this.loadingInvoiceCount = false)))
      .subscribe({
        next: (points) => {
          this.invoiceCountChart = this.buildInvoiceCountChart(points);
        },
        error: () => {
          this.invoiceCountChart = this.buildInvoiceCountChart([]);
        },
      });
  }

  private applySummary(summary: SummaryResponseV1): void {
    const totalSales = this.toNumber(summary?.totalSales);
    const totalCollection = this.toNumber(summary?.totalCollection);
    const totalDue = this.toNumber(summary?.totalDue);
    const totalStock = this.toNumber(summary?.totalStock);

    this.summaryCards = [
      {
        label: 'Total sales',
        value: this.formatCurrency(totalSales),
        hint: 'Invoice totals in the selected range',
        tone: 'green',
        icon: 'revenue',
      },
      {
        label: 'Total collection',
        value: this.formatCurrency(totalCollection),
        hint: 'Amounts paid in the selected range',
        tone: 'teal',
        icon: 'week',
      },
      {
        label: 'Total due',
        value: this.formatCurrency(totalDue),
        hint: 'Unpaid balance in the selected range',
        tone: 'amber',
        icon: 'due',
      },
      {
        label: 'Total stock',
        value: formatToBdNumberingSystem(totalStock),
        hint: 'Current on-hand quantity for the store',
        tone: 'rose',
        icon: 'count',
      },
    ];
  }

  private buildRevenueTrendChart(points: SalesTrendPointResponse[]): RevenueTrendChart {
    const labels = points.length
      ? points.map((point) => this.trendLabel(point.salesDate, points.length))
      : ['No sales'];
    const revenueSeries = points.length
      ? points.map((point) => this.toNumber(point.revenue))
      : [0];
    const invoiceSeries = points.length
      ? points.map((point) => this.toNumber(point.invoiceCount))
      : [0];

    return {
      series: [
        { name: 'Revenue', type: 'area', data: revenueSeries },
        { name: 'Invoices', type: 'column', data: invoiceSeries },
      ],
      chart: {
        type: 'line',
        height: 320,
        toolbar: { show: false },
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        foreColor: '#5f7469',
      },
      colors: ['#1f8054', '#2a9d6a'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3, 0] },
      fill: {
        type: ['gradient', 'solid'],
        gradient: {
          shadeIntensity: 0.35,
          opacityFrom: 0.42,
          opacityTo: 0.04,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: 'rgba(18, 53, 40, 0.08)',
        strokeDashArray: 4,
        padding: { left: 8, right: 8 },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: [
        {
          title: { text: 'Revenue' },
          labels: {
            formatter: (value: number) => this.formatCompactNumber(value),
          },
        },
        {
          opposite: true,
          title: { text: 'Invoices' },
          labels: {
            formatter: (value: number) => formatToBdNumberingSystem(value, 0),
          },
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: (value) => this.formatCurrency(Number(value ?? 0)),
          },
          {
            formatter: (value) => formatToBdNumberingSystem(Number(value ?? 0), 0),
          },
        ],
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontWeight: 600,
      },
    };
  }

  private trendLabel(salesDate: string | undefined, pointCount: number): string {
    if (pointCount <= 7) {
      const date = toDatePickerValue(salesDate);
      if (date) {
        return date.toLocaleDateString('en-GB', { weekday: 'short' });
      }
    }
    return toDisplayDate(salesDate) || '—';
  }

  private buildInvoiceCountChart(points: InvoiceCountPointResponse[]): InvoiceCountChart {
    const labels = points.length
      ? points.map((point) => toOrdinalDisplayDate(point.salesDate) || '—')
      : ['No sales'];
    const data = points.length ? points.map((point) => this.toNumber(point.invoiceCount)) : [0];

    return {
      series: [{ name: 'Invoices', data }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        foreColor: '#5f7469',
      },
      colors: ['#176643'],
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: points.length > 14 ? '55%' : '46%',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => formatToBdNumberingSystem(Number(value ?? 0), 0),
      },
      grid: {
        borderColor: 'rgba(18, 53, 40, 0.08)',
        strokeDashArray: 4,
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          rotate: points.length > 10 ? -45 : 0,
          hideOverlappingLabels: false,
        },
      },
      yaxis: {
        labels: {
          formatter: (value) => formatToBdNumberingSystem(value, 0),
        },
      },
      tooltip: {
        y: {
          formatter: (value) =>
            `${formatToBdNumberingSystem(Number(value ?? 0), 0)} invoice(s)`,
        },
      },
    };
  }

  private emptySummaryCards(hint = 'Loading summary…'): SummaryCard[] {
    return [
      {
        label: 'Total sales',
        value: '—',
        hint,
        tone: 'green',
        icon: 'revenue',
      },
      {
        label: 'Total collection',
        value: '—',
        hint,
        tone: 'teal',
        icon: 'week',
      },
      {
        label: 'Total due',
        value: '—',
        hint,
        tone: 'amber',
        icon: 'due',
      },
      {
        label: 'Total stock',
        value: '—',
        hint,
        tone: 'rose',
        icon: 'count',
      },
    ];
  }

  private defaultStoreId(): string | null {
    const mainStore = this.storeOptions.find((store) => store.isMain);
    if (mainStore?.id) {
      return mainStore.id;
    }
    return this.storeOptions[0]?.id ?? null;
  }

  private defaultStartDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  private defaultEndDate(): Date {
    return new Date();
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatCurrency(value: number): string {
    return `৳ ${formatToBdNumberingSystem(value)}`;
  }

  private formatCompactNumber(value: number): string {
    if (value >= 100000) {
      return `${formatToBdNumberingSystem(value / 100000, 1)}L`;
    }
    if (value >= 1000) {
      return `${formatToBdNumberingSystem(value / 1000, 1)}K`;
    }
    return formatToBdNumberingSystem(value, 0);
  }
}
