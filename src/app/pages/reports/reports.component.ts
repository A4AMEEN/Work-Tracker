import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  filters = { from: '', to: '', person: '', module: '', status: '' };
  data: any;
  dailyReport: any;
  selectedDate = new Date().toISOString().split('T')[0];

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
    this.reportService.getDailyReport(this.selectedDate).subscribe({
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