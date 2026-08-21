import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-home',
  standalone: false,
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('inventoryChart')
  private readonly chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  readonly summaryCards = [
    { label: 'Total SKUs', value: '1,248', change: '+4.2%' },
    { label: 'Low stock', value: '36', change: '-2.1%' },
    { label: 'Orders today', value: '182', change: '+12%' },
    { label: 'Warehouses', value: '5', change: '0%' },
  ];

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Stock movements',
            data: [120, 145, 132, 168, 190, 175, 210],
            borderColor: '#1f8054',
            backgroundColor: 'rgba(31, 128, 84, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#1f8054',
          },
          {
            label: 'Outgoing orders',
            data: [80, 95, 88, 110, 125, 118, 140],
            borderColor: '#2a9d6a',
            backgroundColor: 'rgba(42, 157, 106, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#2a9d6a',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Weekly inventory activity',
            font: { size: 14, weight: 'normal' },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    };

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }
}
