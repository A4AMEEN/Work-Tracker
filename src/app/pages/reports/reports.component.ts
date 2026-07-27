import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';

type ReportMode = 'taskDate' | 'completedOn' | 'both';
type TabId = 'daily' | 'summary' | 'weekly' | 'monthly';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  activeTab: TabId = 'summary';

  filters = {
    from: '',
    to: '',
    person: '',
    module: '',
    status: '',
    mode: 'taskDate' as ReportMode
  };
  summaryData: any;
  dailyReport: any;

  selectedDate = new Date().toISOString().split('T')[0];
  dailyMode: ReportMode = 'taskDate';

  loading = false;
  reportCopied = false;

  persons = ['All', 'Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];
  selectedDailyPersons: string[] = [];
  selectedSummaryPersons: string[] = [];
  selectedWeeklyPersons: string[] = [];
  selectedMonthlyPersons: string[] = [];
  selectedWeeklyStatuses: string[] = [];
  selectedMonthlyStatuses: string[] = [];

  statuses = ['Pending', 'Working', 'Done', 'Backend Needed', 'Testing', 'Test Done', 'Rework', 'Completed'];

  weeklyDate = new Date().toISOString().split('T')[0];
  weeklyData: any = null;
  weeklyLoading = false;

  monthlyDate = new Date().toISOString().split('T')[0];
  monthlyData: any = null;
  monthlyLoading = false;

  dailyUserDropdownOpen = false;
  weeklyUserDropdownOpen = false;
  weeklyStatusDropdownOpen = false;
  monthlyUserDropdownOpen = false;
  monthlyStatusDropdownOpen = false;

  expandedWeeklyPeriods: Set<string> = new Set();
  expandedMonthlyPeriods: Set<string> = new Set();
  expandedWeeklyUsers: Set<string> = new Set();
  expandedMonthlyUsers: Set<string> = new Set();
  expandedTaskIds: Set<string> = new Set();

  constructor(
    private reportService: ReportService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.auth.currentUser()?.name || 'Ameen';
    this.selectedDailyPersons = [currentUser];
    this.selectedSummaryPersons = [currentUser];
    this.selectedWeeklyPersons = [currentUser];
    this.selectedMonthlyPersons = [currentUser];
    this.filters.person = currentUser;
    this.loadReport();
    this.loadDailyReport();
  }

  setActiveTab(tab: TabId): void {
    this.activeTab = tab;
    if (tab === 'weekly' && !this.weeklyData) this.loadWeeklyReport();
    if (tab === 'monthly' && !this.monthlyData) this.loadMonthlyReport();
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
    this.selectedDailyPersons = this.togglePerson(this.selectedDailyPersons, person);
    this.loadDailyReport();
  }

  toggleSummaryPerson(person: string): void {
    this.selectedSummaryPersons = this.togglePerson(this.selectedSummaryPersons, person);
    this.filters.person = this.getPersonParam(this.selectedSummaryPersons);
    this.loadReport();
  }

  toggleWeeklyPerson(person: string): void {
    this.selectedWeeklyPersons = this.togglePerson(this.selectedWeeklyPersons, person);
    this.loadWeeklyReport();
  }

  toggleMonthlyPerson(person: string): void {
    this.selectedMonthlyPersons = this.togglePerson(this.selectedMonthlyPersons, person);
    this.loadMonthlyReport();
  }

  toggleWeeklyStatus(status: string): void {
    if (this.selectedWeeklyStatuses.includes(status)) {
      this.selectedWeeklyStatuses = this.selectedWeeklyStatuses.filter(s => s !== status);
    } else {
      this.selectedWeeklyStatuses = [...this.selectedWeeklyStatuses, status];
    }
    this.loadWeeklyReport();
  }

  toggleMonthlyStatus(status: string): void {
    if (this.selectedMonthlyStatuses.includes(status)) {
      this.selectedMonthlyStatuses = this.selectedMonthlyStatuses.filter(s => s !== status);
    } else {
      this.selectedMonthlyStatuses = [...this.selectedMonthlyStatuses, status];
    }
    this.loadMonthlyReport();
  }

  private togglePerson(selected: string[], person: string): string[] {
    const currentUser = this.auth.currentUser()?.name || 'Ameen';
    if (person === 'All') return ['All'];
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

  getStatusParam(selected: string[]): string {
    if (!selected.length) return '';
    return selected.join(',');
  }

  loadReport(): void {
    this.loading = true;
    const payload = {
      ...this.filters,
      person: this.getPersonParam(this.selectedSummaryPersons)
    };
    this.reportService.getSummary(payload).subscribe({
      next: (res) => { this.summaryData = res.data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  loadDailyReport(): void {
    this.reportService
      .getDailyReport(this.selectedDate, this.dailyMode, this.getPersonParam(this.selectedDailyPersons))
      .subscribe({ next: (res) => { this.dailyReport = res.data; } });
  }

  loadWeeklyReport(): void {
    this.weeklyLoading = true;
    this.weeklyData = null;
    const payload: Record<string, string> = { groupBy: 'weekly' };
    const range = this.getWeekRange(this.weeklyDate);
    payload.from = range.start;
    payload.to = range.end;
    const personParam = this.getPersonParam(this.selectedWeeklyPersons);
    if (personParam && personParam !== 'All') payload.person = personParam;
    const statusParam = this.getStatusParam(this.selectedWeeklyStatuses);
    if (statusParam) payload.status = statusParam;
    this.reportService.getUserReport(payload).subscribe({
      next: (res) => {
        this.weeklyData = res.data;
        this.weeklyLoading = false;
        if (res.data?.periods?.length) this.expandedWeeklyPeriods.add(res.data.periods[0].key);
      },
      error: () => this.weeklyLoading = false
    });
  }

  loadMonthlyReport(): void {
    this.monthlyLoading = true;
    this.monthlyData = null;
    const payload: Record<string, string> = { groupBy: 'monthly' };
    const monthStr = this.monthlyDate.substring(0, 7);
    const range = this.getMonthRange(this.monthlyDate);
    payload.from = range.start;
    payload.to = range.end;
    const personParam = this.getPersonParam(this.selectedMonthlyPersons);
    if (personParam && personParam !== 'All') payload.person = personParam;
    const statusParam = this.getStatusParam(this.selectedMonthlyStatuses);
    if (statusParam) payload.status = statusParam;
    this.reportService.getUserReport(payload).subscribe({
      next: (res) => {
        this.monthlyData = res.data;
        this.monthlyLoading = false;
        if (res.data?.periods?.length) this.expandedMonthlyPeriods.add(res.data.periods[0].key);
      },
      error: () => this.monthlyLoading = false
    });
  }

  copyDailyReport(): void {
    if (!this.dailyReport?.message) return;
    navigator.clipboard.writeText(this.dailyReport.message).then(() => {
      this.reportCopied = true;
      setTimeout(() => { this.reportCopied = false; }, 2000);
    });
  }

  exportCSV(): void {
    const tasks = this.summaryData?.tasks || [];
    if (!tasks.length) return;
    const keys = ['date', 'day', 'module', 'page', 'description', 'workingType', 'status', 'priority', 'person', 'completedAt', 'remarks', 'testRemarks', 'reworkCount'];
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

  toggleDailyUserDropdown(): void { this.dailyUserDropdownOpen = !this.dailyUserDropdownOpen; }
  toggleWeeklyUserDropdown(): void { this.weeklyUserDropdownOpen = !this.weeklyUserDropdownOpen; }
  toggleWeeklyStatusDropdown(): void { this.weeklyStatusDropdownOpen = !this.weeklyStatusDropdownOpen; }
  toggleMonthlyUserDropdown(): void { this.monthlyUserDropdownOpen = !this.monthlyUserDropdownOpen; }
  toggleMonthlyStatusDropdown(): void { this.monthlyStatusDropdownOpen = !this.monthlyStatusDropdownOpen; }

  dailyUsersLabel(): string {
    if (this.selectedDailyPersons.includes('All')) return 'All Users';
    if (this.selectedDailyPersons.length === 1) return this.selectedDailyPersons[0];
    return `${this.selectedDailyPersons.length} users selected`;
  }

  weeklyUsersLabel(): string {
    if (this.selectedWeeklyPersons.includes('All')) return 'All Users';
    if (this.selectedWeeklyPersons.length === 1) return this.selectedWeeklyPersons[0];
    return `${this.selectedWeeklyPersons.length} users selected`;
  }

  weeklyStatusLabel(): string {
    if (!this.selectedWeeklyStatuses.length) return 'All Statuses';
    if (this.selectedWeeklyStatuses.length === 1) return this.selectedWeeklyStatuses[0];
    return `${this.selectedWeeklyStatuses.length} statuses selected`;
  }

  monthlyUsersLabel(): string {
    if (this.selectedMonthlyPersons.includes('All')) return 'All Users';
    if (this.selectedMonthlyPersons.length === 1) return this.selectedMonthlyPersons[0];
    return `${this.selectedMonthlyPersons.length} users selected`;
  }

  monthlyStatusLabel(): string {
    if (!this.selectedMonthlyStatuses.length) return 'All Statuses';
    if (this.selectedMonthlyStatuses.length === 1) return this.selectedMonthlyStatuses[0];
    return `${this.selectedMonthlyStatuses.length} statuses selected`;
  }

  toggleWeeklyPeriod(key: string): void {
    if (this.expandedWeeklyPeriods.has(key)) this.expandedWeeklyPeriods.delete(key);
    else this.expandedWeeklyPeriods.add(key);
  }

  toggleMonthlyPeriod(key: string): void {
    if (this.expandedMonthlyPeriods.has(key)) this.expandedMonthlyPeriods.delete(key);
    else this.expandedMonthlyPeriods.add(key);
  }

  toggleWeeklyUser(person: string): void {
    if (this.expandedWeeklyUsers.has(person)) this.expandedWeeklyUsers.delete(person);
    else this.expandedWeeklyUsers.add(person);
  }

  toggleMonthlyUser(person: string): void {
    if (this.expandedMonthlyUsers.has(person)) this.expandedMonthlyUsers.delete(person);
    else this.expandedMonthlyUsers.add(person);
  }

  toggleTaskExpand(taskId: string): void {
    if (this.expandedTaskIds.has(taskId)) this.expandedTaskIds.delete(taskId);
    else this.expandedTaskIds.add(taskId);
  }

  getWeekRange(dateStr: string): { start: string; end: string } {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const end = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
    return { start, end };
  }

  getMonthRange(dateStr: string): { start: string; end: string } {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${pad(month)}-${pad(lastDay)}`;
    return { start, end };
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'badge-pending',
      'Working': 'badge-working',
      'Done': 'badge-done',
      'Backend Needed': 'badge-backend-needed',
      'Testing': 'badge-testing',
      'Test Done': 'badge-done',
      'Rework': 'badge-rework',
      'Completed': 'badge-completed'
    };
    return map[status] || 'badge-pending';
  }

  getPriorityBadgeClass(priority: string): string {
    const map: Record<string, string> = {
      'Low': 'badge-low',
      'Medium': 'badge-medium',
      'High': 'badge-high',
      'Urgent': 'badge-urgent'
    };
    return map[priority] || 'badge-medium';
  }

  getWorkingTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'Frontend': 'badge-frontend',
      'Backend': 'badge-backend',
      'Both': 'badge-both'
    };
    return map[type] || 'badge-frontend';
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      'Pending': '#f59e0b',
      'Working': '#3b82f6',
      'Done': '#10b981',
      'Backend Needed': '#ef4444',
      'Testing': '#8b5cf6',
      'Test Done': '#10b981',
      'Rework': '#f97316',
      'Completed': '#10b981'
    };
    return map[status] || '#6b7280';
  }

  get statusKeys(): string[] {
    return ['Pending', 'Working', 'Done', 'Backend Needed', 'Testing', 'Test Done', 'Rework', 'Completed'];
  }

  getStatusSummary(statuses: Record<string, number>): { status: string; count: number }[] {
    return this.statusKeys.filter(s => statuses[s]).map(s => ({ status: s, count: statuses[s] }));
  }

  getSummaryStatusCount(status: string): number {
    const entry = this.summaryData?.byStatus?.find((s: any) => s.status === status);
    return entry?.count || 0;
  }

  getSummaryCompletedCount(): number {
    const s = this.summaryData?.byStatus || [];
    return s.reduce((acc: number, x: any) => {
      if (['Completed', 'Done', 'Test Done'].includes(x.status)) acc += x.count;
      return acc;
    }, 0);
  }

  getPeriodTotalTasks(period: any): number {
    return period.users?.reduce?.((sum: number, u: any) => sum + (u.total || 0), 0) || 0;
  }

  getCellCount(person: string, status: string): number {
    return this.summaryData?.tasks?.filter?.((t: any) => t.person === person && t.status === status)?.length || 0;
  }
}
