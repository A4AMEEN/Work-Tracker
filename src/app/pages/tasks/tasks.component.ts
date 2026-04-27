import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../../core/services/task.service';
import { Priority, Task, TaskPayload, TaskStatus, WorkingType } from '../../core/models/task.model';
import { environment } from '../../../environments/environment';

type TaskView = 'all' | 'today' | 'pending' | 'done' | 'backend' | 'my';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit {
  title = 'Tasks';
  view: TaskView = 'all';

  tasks: Task[] = [];
  loading = false;
  saving = false;
  error = '';

  apiBase = environment.apiUrl.replace('/api', '');

  selectedFiles: File[] = [];
  editingTaskAttachments: any[] = [];

  showModal = false;
  editId = '';

  showRemarkModal = false;
  remarkTitle = '';
  remarkPlaceholder = '';
  remarkText = '';
  remarkAction: null | (() => void) = null;
  remarkSaving = false;

  filters = {
    search: '',
    date: '',
    person: '',
    module: '',
    status: '',
    priority: '',
    workingType: ''
  };

  persons = ['Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];

  statuses: TaskStatus[] = [
    'Pending',
    'Working',
    'Backend Needed',
    'Testing',
    'Test Done',
    'Rework',
    'Done'
  ];

  priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
  workingTypes: WorkingType[] = ['Frontend', 'Backend', 'Both'];

  quickFilter = 'all';

  form: TaskPayload = this.emptyForm();

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.view = data['view'] || 'all';
      this.title = data['title'] || 'Tasks';
      this.resetFilters();
      this.loadTasks();
    });
  }

  loadTasks(): void {
    this.loading = true;
    this.error = '';

    if (this.view === 'today') {
      this.taskService.getTodayTasks().subscribe(this.handleResponse());
      return;
    }

    if (this.view === 'my') {
      this.taskService.getMyTasks().subscribe(this.handleResponse());
      return;
    }

    const apiFilters: any = { ...this.filters, limit: 200 };

    if (this.view === 'pending') apiFilters.status = 'Pending';
    if (this.view === 'done') apiFilters.status = 'Done';
    if (this.view === 'backend') apiFilters.status = 'Backend Needed';
    if (this.quickFilter !== 'all') apiFilters.status = this.quickFilter;

    this.taskService.getTasks(apiFilters).subscribe(this.handleResponse());
  }

  private handleResponse() {
    return {
      next: (res: any) => {
        this.tasks = res.data || [];
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load tasks.';
        this.loading = false;
      }
    };
  }

  applyFilters(): void {
    this.loadTasks();
  }

  setQuickFilter(value: string): void {
    this.quickFilter = value;
    this.loadTasks();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      date: '',
      person: '',
      module: '',
      status: '',
      priority: '',
      workingType: ''
    };

    this.quickFilter = 'all';
  }

  clearFilters(): void {
    this.resetFilters();
    this.loadTasks();
  }

  openAddTask(): void {
    this.editId = '';
    this.selectedFiles = [];
    this.editingTaskAttachments = [];
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEditTask(task: Task): void {
    this.editId = task._id;
    this.selectedFiles = [];
    this.editingTaskAttachments = task.attachments || [];

    this.form = {
      date: task.date,
      module: task.module,
      page: task.page,
      description: task.description,
      workingType: task.workingType,
      status: task.status,
      person: task.person,
      priority: task.priority,
      remarks: task.remarks || ''
    };

    this.showModal = true;
  }

  closeTaskModal(): void {
    if (this.saving) return;

    this.showModal = false;
    this.selectedFiles = [];
    this.editingTaskAttachments = [];
    this.editId = '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  saveTask(): void {
    if (this.saving) return;

    if (!this.form.date || !this.form.module || !this.form.page || !this.form.description) {
      alert('Please fill all required fields.');
      return;
    }

    this.saving = true;

    const request = this.editId
      ? this.taskService.updateTask(this.editId, this.form, this.selectedFiles)
      : this.taskService.createTask(this.form, this.selectedFiles);

    request.subscribe({
      next: (res) => {
        const savedTask = res.data;

        if (this.editId) {
          this.tasks = this.tasks.map(t => t._id === this.editId ? savedTask : t);
        } else {
          this.tasks = [savedTask, ...this.tasks];
        }

        this.saving = false;
        this.showModal = false;
        this.selectedFiles = [];
        this.editingTaskAttachments = [];
        this.editId = '';
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message || 'Save failed.');
      }
    });
  }

  updateStatus(task: Task, status: TaskStatus): void {
    if (task.status === status) return;

    this.openRemarkModal(
      'Update Status',
      `Add remark for "${status}"...`,
      () => {
        this.remarkSaving = true;

        this.taskService.updateStatus(task._id, status, this.remarkText).subscribe({
          next: (res) => {
            this.tasks = this.tasks.map(t => t._id === task._id ? res.data : t);
            this.remarkSaving = false;
            this.closeRemarkModal();
          },
          error: (err) => {
            this.remarkSaving = false;
            alert(err?.error?.message || 'Status update failed.');
          }
        });
      }
    );
  }

  markTestResult(task: Task, passed: boolean): void {
    this.openRemarkModal(
      passed ? 'Test Passed' : 'Test Failed',
      passed ? 'Add test passed remark...' : 'Explain what failed...',
      () => {
        this.remarkSaving = true;

        this.taskService.updateTestResult(task._id, passed, this.remarkText).subscribe({
          next: (res) => {
            this.tasks = this.tasks.map(t => t._id === task._id ? res.data : t);
            this.remarkSaving = false;
            this.closeRemarkModal();
          },
          error: (err) => {
            this.remarkSaving = false;
            alert(err?.error?.message || 'Test update failed.');
          }
        });
      }
    );
  }

  deleteSavedAttachment(fileName: string): void {
    if (!this.editId) return;
    if (!confirm('Delete this attachment?')) return;

    this.taskService.deleteAttachment(this.editId, fileName).subscribe({
      next: (res) => {
        this.editingTaskAttachments = res.data.attachments || [];
        this.tasks = this.tasks.map(t => t._id === this.editId ? res.data : t);
      },
      error: (err) => alert(err?.error?.message || 'Attachment delete failed.')
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete task: ${task.description}?`)) return;

    this.taskService.deleteTask(task._id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t._id !== task._id);
      },
      error: (err) => alert(err?.error?.message || 'Delete failed. Admin only.')
    });
  }

  openRemarkModal(title: string, placeholder: string, action: () => void): void {
    this.remarkTitle = title;
    this.remarkPlaceholder = placeholder;
    this.remarkText = '';
    this.remarkAction = action;
    this.showRemarkModal = true;
  }

  confirmRemark(): void {
    if (this.remarkSaving) return;

    if (this.remarkAction) {
      this.remarkAction();
    }
  }

  closeRemarkModal(): void {
    if (this.remarkSaving) return;

    this.showRemarkModal = false;
    this.remarkText = '';
    this.remarkAction = null;
    this.remarkSaving = false;
  }

  getAttachmentUrl(path: string): string {
    if (!path) return '';

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    return `${this.apiBase}${path}`;
  }

  exportCSV(): void {
    const rows = this.tasks.map(t => ({
      date: t.date,
      day: t.day,
      module: t.module,
      page: t.page,
      description: t.description,
      workingType: t.workingType,
      status: t.status,
      priority: t.priority,
      person: t.person,
      remarks: t.remarks || '',
      reworkCount: t.reworkCount || 0,
      testRemarks: t.testRemarks || ''
    }));

    if (!rows.length) return;

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map(row => header.map(key => JSON.stringify((row as any)[key] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'worktrack-tasks.csv';
    a.click();

    URL.revokeObjectURL(url);
  }

  badgeClass(value: string): string {
    return value.toLowerCase().replace(/ /g, '-');
  }

  private emptyForm(): TaskPayload {
    const today = new Date().toISOString().split('T')[0];

    return {
      date: today,
      module: '',
      page: '',
      description: '',
      workingType: 'Frontend',
      status: 'Pending',
      person: this.auth.currentUser()?.name || 'Ameen',
      priority: 'Medium',
      remarks: ''
    };
  }
}