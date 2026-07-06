import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../../core/services/task.service';
import { SocketService } from '../../core/services/socket.service';
import { Task } from '../../core/models/task.model';
import { environment } from '../../../environments/environment';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.scss'
})
export class ApprovalsComponent implements OnInit, OnDestroy {
  private subs = new Subscription();
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  loading = false;
  error = '';

  apiBase = environment.apiUrl.replace('/api', '');

  activeTab: 'pending' | 'approved' | 'reworked' = 'pending';

  showViewModal = false;
  viewTask: Task | null = null;

  showApproveModal = false;
  approveTaskId = '';
  approveRemarks = '';
  approving = false;

  showReworkModal = false;
  reworkTaskId = '';
  reworkReason = '';
  reworkRemarks = '';
  reworking = false;

  filters = {
    search: '',
    person: '',
    module: ''
  };

  persons = ['Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];

  constructor(
    public auth: AuthService,
    private taskService: TaskService,
    private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.loadTasks();

    this.subs.add(
      interval(30_000).subscribe(() => this.loadTasks()),
    );

    this.subs.add(
      this.socket.onTaskUpdated().subscribe((updated) => {
      const idx = this.tasks.findIndex(t => t._id === updated._id);
      if (idx !== -1) {
        this.tasks[idx] = updated;
        this.applyFilters();
      } else if (
        updated.approverUserId === this.auth.currentUser()?.name &&
        ['Pending', 'Approved', 'Rework'].includes(updated.approvalStatus)
      ) {
        this.tasks = [updated, ...this.tasks];
        this.applyFilters();
      }
    }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadTasks(): void {
    this.loading = true;
    this.error = '';

    const statusFilter = this.activeTab === 'pending'
      ? 'Pending'
      : this.activeTab === 'approved'
        ? 'Approved'
        : 'Rework';

    const apiFilters: Record<string, string> = {
      approverUserId: this.auth.currentUser()?.name || '',
      approvalStatus: statusFilter,
      limit: '200'
    };

    this.taskService.getTasks(apiFilters).subscribe({
      next: (res) => {
        this.tasks = res.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load tasks.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.tasks];
    const search = this.filters.search.toLowerCase();

    if (search) {
      result = result.filter(t =>
        t.description?.toLowerCase().includes(search) ||
        t.module?.toLowerCase().includes(search) ||
        t.page?.toLowerCase().includes(search) ||
        t.person?.toLowerCase().includes(search)
      );
    }

    if (this.filters.person) {
      result = result.filter(t => t.person === this.filters.person);
    }

    if (this.filters.module) {
      result = result.filter(t =>
        t.module?.toLowerCase().includes(this.filters.module.toLowerCase())
      );
    }

    this.filteredTasks = result;
  }

  clearFilters(): void {
    this.filters = { search: '', person: '', module: '' };
    this.applyFilters();
  }

  setTab(tab: 'pending' | 'approved' | 'reworked'): void {
    this.activeTab = tab;
    this.loadTasks();
  }

  openView(task: Task): void {
    this.viewTask = task;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewTask = null;
  }

  openApprove(task: Task): void {
    this.approveTaskId = task._id;
    this.approveRemarks = '';
    this.showApproveModal = true;
  }

  closeApproveModal(): void {
    if (this.approving) return;
    this.showApproveModal = false;
    this.approveTaskId = '';
    this.approveRemarks = '';
  }

  confirmApprove(): void {
    if (this.approving) return;
    this.approving = true;

    this.taskService.approveTask(this.approveTaskId, this.approveRemarks).subscribe({
      next: () => {
        this.approving = false;
        this.closeApproveModal();
        this.loadTasks();
      },
      error: (err) => {
        this.approving = false;
        alert(err?.error?.message || 'Approve failed.');
      }
    });
  }

  openRework(task: Task): void {
    this.reworkTaskId = task._id;
    this.reworkReason = '';
    this.reworkRemarks = '';
    this.showReworkModal = true;
  }

  closeReworkModal(): void {
    if (this.reworking) return;
    this.showReworkModal = false;
    this.reworkTaskId = '';
    this.reworkReason = '';
    this.reworkRemarks = '';
  }

  confirmRework(): void {
    if (this.reworking) return;
    if (!this.reworkReason.trim()) {
      alert('Please provide a reason for rework.');
      return;
    }

    this.reworking = true;

    this.taskService.reworkTask(this.reworkTaskId, this.reworkReason, this.reworkRemarks).subscribe({
      next: () => {
        this.reworking = false;
        this.closeReworkModal();
        this.loadTasks();
      },
      error: (err) => {
        this.reworking = false;
        alert(err?.error?.message || 'Rework request failed.');
      }
    });
  }

  daysPending(createdAt?: string): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }

  isTextFile(file: any): boolean {
    return (
      file?.mimeType?.startsWith('text/') ||
      file?.originalName?.toLowerCase().endsWith('.txt')
    );
  }

  getAttachmentUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.apiBase}${path}`;
  }

  openAttachment(file: any): void {
    const url = this.getAttachmentUrl(file.filePath);
    if (this.isTextFile(file)) {
      fetch(url)
        .then(res => res.text())
        .then(text => {
          const w = window.open('', '_blank');
          if (w) {
            w.document.write(`
              <html><head><title>${file.originalName}</title>
              <style>body{background:#0a0c10;color:#e8eaf0;font-family:monospace;padding:24px;white-space:pre-wrap;line-height:1.6}</style>
              </head><body>${this.escapeHtml(text)}</body></html>
            `);
            w.document.close();
          }
        });
      return;
    }
    window.open(url, '_blank');
  }

  escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  badgeClass(value: string): string {
    return value.toLowerCase().replace(/ /g, '-');
  }
}
