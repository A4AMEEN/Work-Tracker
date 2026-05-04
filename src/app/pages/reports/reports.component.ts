import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';

type ReportMode = 'taskDate' | 'completedOn' | 'both';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  filters = {
    from: '',
    to: '',
    person: '',
    module: '',
    status: '',
    mode: 'taskDate' as ReportMode
  };

  data: any;
  dailyReport: any;

  selectedDate = new Date().toISOString().split('T')[0];
  dailyMode: ReportMode = 'taskDate';

  loading = false;
  reportCopied = false;

  persons = ['Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];

  statuses = [
    'Pending',
    'Working',
    'Done',
    'Backend Needed',
    'Testing',
    'Test Done',
    'Rework'
  ];

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadReport();
    this.loadDailyReport();
  }

  setDailyMode(mode: ReportMode): void {
    this.dailyMode = mode;
    this.loadDailyReport();
  }

  setSummaryMode(mode: ReportMode): void {
    this.filters.mode = mode;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;

    this.reportService.getSummary(this.filters).subscribe({
      next: (res) => {
        this.data = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadDailyReport(): void {
    this.reportService.getDailyReport(this.selectedDate, this.dailyMode).subscribe({
      next: (res) => {
        this.dailyReport = res.data;
      }
    });
  }

  copyDailyReport(): void {
    if (!this.dailyReport?.message) return;

    navigator.clipboard.writeText(this.dailyReport.message).then(() => {
      this.reportCopied = true;

      setTimeout(() => {
        this.reportCopied = false;
      }, 2000);
    });
  }

  exportCSV(): void {
    const tasks = this.data?.tasks || [];
    if (!tasks.length) return;

    const keys = [
      'date',
      'day',
      'module',
      'page',
      'description',
      'workingType',
      'status',
      'priority',
      'person',
      'completedAt',
      'remarks',
      'testRemarks',
      'reworkCount'
    ];

    const csv = [
      keys.join(','),
      ...tasks.map((t: any) => keys.map(k => JSON.stringify(t[k] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'worktrack-report.csv';
    a.click();

    URL.revokeObjectURL(url);
  }
}