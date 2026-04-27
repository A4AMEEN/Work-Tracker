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
  error = '';

  apiBase = environment.apiUrl.replace('/api', '');

  selectedFiles: File[] = [];

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

  showModal = false;
  editId = '';
  form: TaskPayload = this.emptyForm();
editingTaskAttachments: any[] = [];
  quickFilter = 'all';

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
    this.form = this.emptyForm();
    this.showModal = true;
    this.editingTaskAttachments = [];
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

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  saveTask(): void {
    if (!this.form.date || !this.form.module || !this.form.page || !this.form.description) {
      alert('Please fill all required fields.');
      return;
    }

    const request = this.editId
      ? this.taskService.updateTask(this.editId, this.form, this.selectedFiles)
      : this.taskService.createTask(this.form, this.selectedFiles);

    request.subscribe({
      next: () => {
        this.showModal = false;
        this.selectedFiles = [];
        this.loadTasks();
      },
      error: (err) => alert(err?.error?.message || 'Save failed.')
    });
  }

  updateStatus(task: Task, status: TaskStatus): void {
    const remark = prompt('Remark optional') || '';

    this.taskService.updateStatus(task._id, status, remark).subscribe({
      next: () => this.loadTasks(),
      error: (err) => alert(err?.error?.message || 'Status update failed.')
    });
  }

  markTestResult(task: Task, passed: boolean): void {
    const remark = prompt(passed ? 'Test passed remark' : 'Why test failed?') || '';

    this.taskService.updateTestResult(task._id, passed, remark).subscribe({
      next: () => this.loadTasks(),
      error: (err) => alert(err?.error?.message || 'Test update failed.')
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete task: ${task.description}?`)) return;

    this.taskService.deleteTask(task._id).subscribe({
      next: () => this.loadTasks(),
      error: (err) => alert(err?.error?.message || 'Delete failed. Admin only.')
    });
  }

getAttachmentUrl(path: string): string {
  if (!path) return '';

  // Cloudinary/full external URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Old local upload path
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

    const header = Object.keys(rows[0] || {});
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

  deleteSavedAttachment(fileName: string): void {
  if (!this.editId) return;

  if (!confirm('Delete this attachment?')) return;

  this.taskService.deleteAttachment(this.editId, fileName).subscribe({
    next: (res) => {
      this.editingTaskAttachments = res.data.attachments || [];
      this.loadTasks();
    },
    error: (err) => alert(err?.error?.message || 'Attachment delete failed.')
  });
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