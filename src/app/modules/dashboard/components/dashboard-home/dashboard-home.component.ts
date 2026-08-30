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
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { formatToBdNumberingSystem } from '../../../../core/utils/bd-number.util';
import { toApiDate, toDatePickerValue } from '../../../../core/utils/date.util';
import {
  paymentMethodLabel,
  salesStatusLabel,
} from '../../../../models/enums/SalesStatus';
import { SalesResponse } from '../../../../models/response/SalesResponse';
import { StoreResponse } from '../../../../models/response/StoreResponse';
import { SummaryResponseV1 } from '../../../../models/response/SummaryResponseV1';
import { DashboardSummarySearchDto } from '../../../../models/search/DashboardSummarySearchDto';
import { SalesSearchDto } from '../../../../models/search/SalesSearchDto';
import { StoreSearchDto } from '../../../../models/search/StoreSearchDto';
import { DashboardApiService } from '../../../../services/DashboardApiService';
import { SalesApiService } from '../../../../services/SalesApiService';
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

interface PaymentMixChart {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
}

interface StatusChart {
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
  loadingStores = false;
  loadingSummary = false;
  submitted = false;
  storeOptions: StoreResponse[] = [];
  summaryCards: SummaryCard[] = this.emptySummaryCards();
  revenueTrendChart: RevenueTrendChart | null = null;
  paymentMixChart: PaymentMixChart | null = null;
  statusChart: StatusChart | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dashboardApi: DashboardApiService,
    private readonly salesApi: SalesApiService,
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
    this.loadChartData();
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

    this.loadSummary();
  }

  onReset(): void {
    this.submitted = false;
    this.searchForm.reset({
      storeId: this.defaultStoreId(),
      startDate: this.defaultStartDate(),
      endDate: this.defaultEndDate(),
    });
    this.loadSummary();
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
          this.loadSummary();
        },
        error: () => {
          this.summaryCards = this.emptySummaryCards('Failed to load stores');
        },
      });
  }

  private loadSummary(): void {
    const storeId = this.searchForm.get('storeId')?.value as string | null;
    const startDate = toApiDate(this.searchForm.get('startDate')?.value);
    const endDate = toApiDate(this.searchForm.get('endDate')?.value);
    if (!storeId || !startDate || !endDate) {
      this.summaryCards = this.emptySummaryCards('Select store and date range');
      return;
    }
    if (startDate > endDate) {
      this.summaryCards = this.emptySummaryCards('Start date cannot be after end date');
      return;
    }

    this.loadingSummary = true;
    this.dashboardApi
      .getSummary1(
        new DashboardSummarySearchDto({
          storeId,
          startDate,
          endDate,
        }),
      )
      .pipe(finalize(() => (this.loadingSummary = false)))
      .subscribe({
        next: (summary) => this.applySummary(summary),
        error: () => {
          this.summaryCards = this.emptySummaryCards('Failed to load summary');
        },
      });
  }

  private loadChartData(): void {
    this.loading = true;
    this.salesApi
      .searchList(new SalesSearchDto())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (sales) => this.applySalesData(sales ?? []),
        error: () => this.applySalesData([]),
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

  private applySalesData(sales: SalesResponse[]): void {
    const today = this.startOfDay(new Date());
    const weekStart = this.startOfDay(this.daysAgo(6));
    const weekSales = sales.filter((sale) => {
      const date = this.parseSaleDate(sale);
      return date ? date >= weekStart && date <= today : false;
    });

    this.revenueTrendChart = this.buildRevenueTrendChart(weekSales, weekStart);
    this.paymentMixChart = this.buildPaymentMixChart(weekSales);
    this.statusChart = this.buildStatusChart(weekSales);
  }

  private buildRevenueTrendChart(
    weekSales: SalesResponse[],
    weekStart: Date,
  ): RevenueTrendChart {
    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });

    const labels = dayBuckets.map((date) =>
      date.toLocaleDateString('en-GB', { weekday: 'short' }),
    );
    const revenueSeries = dayBuckets.map((date) =>
      weekSales
        .filter((sale) => {
          const saleDate = this.parseSaleDate(sale);
          return saleDate ? this.sameDay(saleDate, date) : false;
        })
        .reduce((total, sale) => total + (sale.totalAmount ?? 0), 0),
    );
    const invoiceSeries = dayBuckets.map((date) =>
      weekSales.filter((sale) => {
        const saleDate = this.parseSaleDate(sale);
        return saleDate ? this.sameDay(saleDate, date) : false;
      }).length,
    );

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

  private buildPaymentMixChart(weekSales: SalesResponse[]): PaymentMixChart {
    const totals = new Map<string, number>();
    for (const sale of weekSales) {
      const label = paymentMethodLabel(sale.paymentMethod);
      totals.set(label, (totals.get(label) ?? 0) + (sale.totalAmount ?? 0));
    }

    const labels = [...totals.keys()];
    const series = labels.map((label) => totals.get(label) ?? 0);

    return {
      series: series.length ? series : [0],
      labels: labels.length ? labels : ['No sales'],
      chart: {
        type: 'donut',
        height: 320,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      },
      colors: ['#1f8054', '#2a9d6a', '#1a7a8c', '#4caf86'],
      dataLabels: {
        enabled: true,
        formatter: (value) => `${Math.round(Number(value))}%`,
      },
      legend: {
        position: 'bottom',
        fontWeight: 600,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Revenue',
                formatter: () =>
                  this.formatCurrency(series.reduce((total, amount) => total + amount, 0)),
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (value) => this.formatCurrency(Number(value ?? 0)),
        },
      },
    };
  }

  private buildStatusChart(weekSales: SalesResponse[]): StatusChart {
    const totals = new Map<string, number>();
    for (const sale of weekSales) {
      const label = salesStatusLabel(sale.salesStatus);
      totals.set(label, (totals.get(label) ?? 0) + 1);
    }

    const categories = [...totals.keys()];
    const data = categories.map((label) => totals.get(label) ?? 0);

    return {
      series: [{ name: 'Invoices', data: data.length ? data : [0] }],
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
          columnWidth: '46%',
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: 'rgba(18, 53, 40, 0.08)',
        strokeDashArray: 4,
      },
      xaxis: {
        categories: categories.length ? categories : ['No sales'],
        axisBorder: { show: false },
        axisTicks: { show: false },
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

  private parseSaleDate(sale: SalesResponse): Date | null {
    return toDatePickerValue(sale.salesDate);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private sameDay(left: Date, right: Date): boolean {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }
}
