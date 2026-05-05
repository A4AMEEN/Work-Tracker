import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';

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
dailyUserDropdownOpen = false;
  data: any;
  dailyReport: any;

  selectedDate = new Date().toISOString().split('T')[0];
  dailyMode: ReportMode = 'taskDate';

  loading = false;
  reportCopied = false;

  persons = ['All', 'Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];

  selectedDailyPersons: string[] = [];
  selectedSummaryPersons: string[] = [];

  statuses = [
    'Pending',
    'Working',
    'Done',
    'Backend Needed',
    'Testing',
    'Test Done',
    'Rework'
  ];

  constructor(
    private reportService: ReportService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.auth.currentUser()?.name || 'Ameen';

    this.selectedDailyPersons = [currentUser];
    this.selectedSummaryPersons = [currentUser];

    this.filters.person = currentUser;

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

  toggleDailyPerson(person: string): void {
    this.selectedDailyPersons = this.togglePersonSelection(
      this.selectedDailyPersons,
      person
    );

    this.loadDailyReport();
  }

  toggleSummaryPerson(person: string): void {
    this.selectedSummaryPersons = this.togglePersonSelection(
      this.selectedSummaryPersons,
      person
    );

    this.filters.person = this.getPersonParam(this.selectedSummaryPersons);
    this.loadReport();
  }

  private togglePersonSelection(selected: string[], person: string): string[] {
    const currentUser = this.auth.currentUser()?.name || 'Ameen';

    if (person === 'All') {
      return ['All'];
    }

    let next = selected.filter(p => p !== 'All');

    if (next.includes(person)) {
      next = next.filter(p => p !== person);
    } else {
      next = [...next, person];
    }

    return next.length ? next : [currentUser];
  }

  getPersonParam(selected: string[]): string {
    if (selected.includes('All')) return 'All';
    return selected.join(',');
  }

  loadReport(): void {
    this.loading = true;

    const payload = {
      ...this.filters,
      person: this.getPersonParam(this.selectedSummaryPersons)
    };

    this.reportService.getSummary(payload).subscribe({
      next: (res) => {
        this.data = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadDailyReport(): void {
    this.reportService
      .getDailyReport(
        this.selectedDate,
        this.dailyMode,
        this.getPersonParam(this.selectedDailyPersons)
      )
      .subscribe({
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
  toggleDailyUserDropdown(): void {
  this.dailyUserDropdownOpen = !this.dailyUserDropdownOpen;
}

dailyUsersLabel(): string {
  if (this.selectedDailyPersons.includes('All')) return 'All Users';

  if (this.selectedDailyPersons.length === 1) {
    return this.selectedDailyPersons[0];
  }

  return `${this.selectedDailyPersons.length} users selected`;
}
}