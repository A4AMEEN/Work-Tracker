import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { BugService } from '../../core/services/bug.service';
import { Bug, BugPayload, BugSeverity, BugStatus } from '../../core/models/bug.model';

@Component({
  selector: 'app-bugs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './bugs.component.html',
  styleUrl: './bugs.component.scss'
})
export class BugsComponent implements OnInit {
  bugs: Bug[] = [];
  filteredBugs: Bug[] = [];

  loading = false;
  saving = false;
  error = '';

  apiBase = environment.apiUrl.replace('/api', '');

  showModal = false;
  editId = '';
editingBugAttachments: any[] = [];
  selectedFiles: File[] = [];

  persons = ['Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];

  severities: BugSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

  statuses: BugStatus[] = [
    'Open',
    'Assigned',
    'Working',
    'Fixed',
    'Testing',
    'Reopened',
    'Closed'
  ];

  filters = {
    search: '',
    status: '',
    severity: '',
    assignedTo: '',
    module: ''
  };

  form: BugPayload = this.emptyForm();

  constructor(
    public auth: AuthService,
    private bugService: BugService
  ) {}

  ngOnInit(): void {
    this.loadBugs();
  }

  loadBugs(): void {
    this.loading = true;
    this.error = '';

    this.bugService.getBugs().subscribe({
      next: (res) => {
        this.bugs = res.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load bugs.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.bugs];

    const search = this.filters.search.toLowerCase();

    if (search) {
      result = result.filter(b =>
        b.title?.toLowerCase().includes(search) ||
        b.description?.toLowerCase().includes(search) ||
        b.module?.toLowerCase().includes(search) ||
        b.page?.toLowerCase().includes(search) ||
        b.assignedTo?.toLowerCase().includes(search) ||
        b.reportedBy?.toLowerCase().includes(search)
      );
    }

    if (this.filters.status) result = result.filter(b => b.status === this.filters.status);
    if (this.filters.severity) result = result.filter(b => b.severity === this.filters.severity);
    if (this.filters.assignedTo) result = result.filter(b => b.assignedTo === this.filters.assignedTo);
    if (this.filters.module) {
      result = result.filter(b =>
        b.module?.toLowerCase().includes(this.filters.module.toLowerCase())
      );
    }

    this.filteredBugs = result;
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      status: '',
      severity: '',
      assignedTo: '',
      module: ''
    };

    this.applyFilters();
  }

  openAddBug(): void {
    this.editId = '';
    this.selectedFiles = [];
    this.form = this.emptyForm();
    this.showModal = true;
    this.editingBugAttachments = [];
  }

  deleteSavedAttachment(fileName: string): void {
  if (!this.editId) return;
  if (!confirm('Delete this attachment?')) return;

  this.bugService.deleteAttachment(this.editId, fileName).subscribe({
    next: (res) => {
      this.editingBugAttachments = res.data.attachments || [];
      this.bugs = this.bugs.map(b => b._id === this.editId ? res.data : b);
      this.applyFilters();
    },
    error: (err) => alert(err?.error?.message || 'Attachment delete failed.')
  });
}


  openEditBug(bug: Bug): void {
    this.editId = bug._id;
    this.selectedFiles = [];
this.editingBugAttachments = bug.attachments || [];
    this.form = {
      title: bug.title,
      description: bug.description,
      module: bug.module || '',
      page: bug.page || '',
      severity: bug.severity,
      status: bug.status,
      assignedTo: bug.assignedTo || '',
      remarks: bug.remarks || ''
    };

    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) return;

    this.showModal = false;
    this.editId = '';
    this.selectedFiles = [];
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  saveBug(): void {
    if (this.saving) return;

    if (!this.form.title || !this.form.description) {
      alert('Please enter bug title and description.');
      return;
    }

    this.saving = true;

    const request = this.editId
      ? this.bugService.updateBug(this.editId, this.form, this.selectedFiles)
      : this.bugService.createBug(this.form, this.selectedFiles);

    request.subscribe({
      next: (res) => {
        if (this.editId) {
          this.bugs = this.bugs.map(b => b._id === this.editId ? res.data : b);
        } else {
          this.bugs = [res.data, ...this.bugs];
        }

        this.applyFilters();
        this.saving = false;
        this.closeModal();
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message || 'Bug save failed.');
      }
    });
  }

  updateStatus(bug: Bug, status: BugStatus): void {
    if (bug.status === status) return;

    const remark = prompt(`Remark for ${status}`) || '';

    this.bugService.updateStatus(bug._id, status, remark).subscribe({
      next: (res) => {
        this.bugs = this.bugs.map(b => b._id === bug._id ? res.data : b);
        this.applyFilters();
      },
      error: (err) => alert(err?.error?.message || 'Status update failed.')
    });
  }

  convertBugToTask(bug: Bug): void {
    const assignTo = prompt('Assign task to:', bug.assignedTo || 'Ameen') || bug.assignedTo || 'Ameen';

    this.bugService.convertToTask(bug._id, assignTo).subscribe({
      next: () => {
        alert('Bug converted to task successfully.');
        this.loadBugs();
      },
      error: (err) => alert(err?.error?.message || 'Convert failed.')
    });
  }

  deleteBug(bug: Bug): void {
    if (!confirm(`Delete bug: ${bug.title}?`)) return;

    this.bugService.deleteBug(bug._id).subscribe({
      next: () => {
        this.bugs = this.bugs.filter(b => b._id !== bug._id);
        this.applyFilters();
      },
      error: (err) => alert(err?.error?.message || 'Delete failed.')
    });
  }

getAttachmentUrl(path: string): string {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${this.apiBase}${path}`;
}

  badgeClass(value: string): string {
    return value.toLowerCase().replace(/ /g, '-');
  }

  severityClass(severity: string): string {
    return `sev-${severity.toLowerCase()}`;
  }

  private emptyForm(): BugPayload {
    return {
      title: '',
      description: '',
      module: '',
      page: '',
      severity: 'Medium',
      status: 'Open',
      assignedTo: this.auth.currentUser()?.name || 'Ameen',
      remarks: ''
    };
  }
}