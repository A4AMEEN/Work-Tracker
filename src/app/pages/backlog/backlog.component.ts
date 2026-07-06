import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { BacklogService } from '../../core/services/backlog.service';
import { Backlog, BacklogPayload } from '../../core/models/backlog.model';

@Component({
  selector: 'app-backlog',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './backlog.component.html',
  styleUrl: './backlog.component.scss'
})
export class BacklogComponent implements OnInit {
  backlogs: Backlog[] = [];
  filteredBacklogs: Backlog[] = [];

  loading = false;
  saving = false;
  error = '';

  showViewModal = false;
  viewItem: Backlog | null = null;

  apiBase = environment.apiUrl.replace('/api', '');

  showModal = false;
  editId = '';
  editingAttachments: any[] = [];
  selectedFiles: File[] = [];

  persons = ['Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];

  filters = {
    search: '',
    module: '',
    fromUser: ''
  };

  form: BacklogPayload = this.emptyForm();

  constructor(
    public auth: AuthService,
    private backlogService: BacklogService
  ) {}

  ngOnInit(): void {
    this.loadBacklogs();
  }

  loadBacklogs(): void {
    this.loading = true;
    this.error = '';

    this.backlogService.getBacklogs().subscribe({
      next: (res) => {
        this.backlogs = res.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load backlogs.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.backlogs];

    const search = this.filters.search.toLowerCase();

    if (search) {
      result = result.filter(b =>
        b.title?.toLowerCase().includes(search) ||
        b.description?.toLowerCase().includes(search) ||
        b.module?.toLowerCase().includes(search) ||
        b.page?.toLowerCase().includes(search) ||
        b.createdBy?.toLowerCase().includes(search) ||
        b.fromUser?.toLowerCase().includes(search)
      );
    }

    if (this.filters.module) {
      result = result.filter(b =>
        b.module?.toLowerCase().includes(this.filters.module.toLowerCase())
      );
    }

    if (this.filters.fromUser) {
      result = result.filter(b => b.fromUser === this.filters.fromUser);
    }

    this.filteredBacklogs = result;
  }

  clearFilters(): void {
    this.filters = { search: '', module: '', fromUser: '' };
    this.applyFilters();
  }

  openView(item: Backlog): void {
    this.viewItem = item;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewItem = null;
  }

  openAdd(): void {
    this.editId = '';
    this.selectedFiles = [];
    this.editingAttachments = [];
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEdit(backlog: Backlog): void {
    this.editId = backlog._id;
    this.selectedFiles = [];
    this.editingAttachments = backlog.attachments || [];
    this.form = {
      title: backlog.title,
      description: backlog.description,
      module: backlog.module || '',
      page: backlog.page || '',
      fromUser: backlog.fromUser || '',
      remarks: backlog.remarks || '',
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

  save(): void {
    if (this.saving) return;

    if (!this.form.title || !this.form.description) {
      alert('Please fill in all required fields.');
      return;
    }

    this.saving = true;

    const request = this.editId
      ? this.backlogService.updateBacklog(this.editId, this.form, this.selectedFiles)
      : this.backlogService.createBacklog(this.form, this.selectedFiles);

    request.subscribe({
      next: (res) => {
        if (this.editId) {
          this.backlogs = this.backlogs.map(b => b._id === this.editId ? res.data : b);
        } else {
          this.backlogs = [res.data, ...this.backlogs];
        }
        this.applyFilters();
        this.saving = false;
        this.closeModal();
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message || 'Save failed.');
      }
    });
  }

  delete(backlog: Backlog): void {
    if (!confirm(`Delete backlog: ${backlog.title}?`)) return;

    this.backlogService.deleteBacklog(backlog._id).subscribe({
      next: () => {
        this.backlogs = this.backlogs.filter(b => b._id !== backlog._id);
        this.applyFilters();
      },
      error: (err) => alert(err?.error?.message || 'Delete failed.')
    });
  }

  deleteSavedAttachment(fileName: string): void {
    if (!this.editId) return;
    if (!confirm('Delete this attachment?')) return;

    this.backlogService.deleteAttachment(this.editId, fileName).subscribe({
      next: (res) => {
        this.editingAttachments = res.data.attachments || [];
        this.backlogs = this.backlogs.map(b => b._id === this.editId ? res.data : b);
        this.applyFilters();
      },
      error: (err) => alert(err?.error?.message || 'Attachment delete failed.')
    });
  }

  getAttachmentUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.apiBase}${path}`;
  }

  isTextFile(file: any): boolean {
    return (
      file?.mimeType?.startsWith('text/') ||
      file?.originalName?.toLowerCase().endsWith('.txt')
    );
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
              <html>
                <head>
                  <title>${file.originalName}</title>
                  <style>
                    body {
                      background: #0a0c10;
                      color: #e8eaf0;
                      font-family: monospace;
                      padding: 24px;
                      white-space: pre-wrap;
                      line-height: 1.6;
                    }
                  </style>
                </head>
                <body>${this.escapeHtml(text)}</body>
              </html>
            `);
            w.document.close();
          }
        });
      return;
    }

    window.open(url, '_blank');
  }

  escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private emptyForm(): BacklogPayload {
    return {
      title: '',
      description: '',
      module: '',
      page: '',
      fromUser: this.auth.currentUser()?.name || 'Ameen',
      remarks: ''
    };
  }
}
