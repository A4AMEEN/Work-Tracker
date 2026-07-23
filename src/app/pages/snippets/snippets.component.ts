import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SnippetService } from '../../core/services/snippet.service';
import { ToastService } from '../../core/services/toast.service';
import { Snippet, SnippetLanguage, SnippetPayload } from '../../core/models/snippet.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type SortOption = 'newest' | 'oldest' | 'most-used' | 'az';

@Component({
  selector: 'app-snippets',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './snippets.component.html',
  styleUrl: './snippets.component.scss',
})
export class SnippetsComponent implements OnInit {
  allSnippets: Snippet[] = [];
  filteredSnippets: Snippet[] = [];
  loading = false;
  saving = false;
  error = '';

  apiBase = environment.apiUrl.replace('/api', '');
  copiedId = '';
  copiedCodeId = '';
  lightboxImage: string | null = null;
  tab: 'all' | 'favorites' = 'all';
  sort: SortOption = 'newest';
  tagInput = '';
  activeTabLabel = 'all';

  languages: SnippetLanguage[] = [
    'TypeScript', 'JavaScript', 'HTML', 'CSS', 'SCSS', 'C#', 'SQL', 'JSON', 'Shell', 'Other',
  ];

  filters = {
    search: '',
    language: '',
    module: '',
  };

  showViewModal = false;
  viewSnippet: Snippet | null = null;

  showModal = false;
  editId = '';
  selectedFiles: File[] = [];
  editingAttachments: any[] = [];

  form: SnippetPayload = this.emptyForm();

  private searchSubject = new Subject<void>();

  constructor(
    public auth: AuthService,
    private snippetService: SnippetService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.applyFilters());

    this.loadSnippets();
  }

  loadSnippets(): void {
    this.loading = true;
    this.error = '';

    const apiFilters: Record<string, string | undefined | null> = {};

    if (this.tab === 'favorites') apiFilters.isFavorite = 'true';
    if (this.filters.language) apiFilters.language = this.filters.language;
    if (this.filters.module) apiFilters.module = this.filters.module;
    if (this.filters.search) apiFilters.search = this.filters.search;
    if (this.sort) apiFilters.sort = this.sort;

    this.snippetService.getAll(apiFilters).subscribe({
      next: (res) => {
        this.allSnippets = res.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load snippets.';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let result = [...this.allSnippets];
    const q = this.filters.search.toLowerCase().trim();

    if (q) {
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (this.filters.language) {
      result = result.filter((s) => s.language === this.filters.language);
    }

    if (this.filters.module) {
      result = result.filter((s) =>
        s.module?.toLowerCase().includes(this.filters.module.toLowerCase()),
      );
    }

    if (this.tab === 'favorites') {
      result = result.filter((s) => s.isFavorite);
    }

    result.sort((a, b) => {
      if (this.sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (this.sort === 'most-used') return (b.usageCount || 0) - (a.usageCount || 0);
      if (this.sort === 'az') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.filteredSnippets = result;
  }

  setTab(tab: 'all' | 'favorites'): void {
    this.tab = tab;
    this.loadSnippets();
  }

  setSort(sort: SortOption): void {
    this.sort = sort;
    this.applyFilters();
  }

  onSearchInput(): void {
    this.searchSubject.next();
  }

  clearFilters(): void {
    this.filters = { search: '', language: '', module: '' };
    this.tab = 'all';
    this.sort = 'newest';
    this.loadSnippets();
  }

  // ---- View Modal ----

  openView(snippet: Snippet): void {
    this.viewSnippet = snippet;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewSnippet = null;
    this.lightboxImage = null;
  }

  copyCode(code: string, id: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCodeId = id;
      setTimeout(() => (this.copiedCodeId = ''), 2000);
    });
  }

  markUsed(snippet: Snippet): void {
    this.snippetService.markUsed(snippet._id).subscribe({
      next: (res) => {
        snippet.usageCount = res.data.usageCount;
        this.toast.success('Marked as used', `"${snippet.title}" usage count updated.`);
      },
      error: () => this.toast.error('Error', 'Failed to mark as used.'),
    });
  }

  toggleFav(snippet: Snippet, event?: Event): void {
    if (event) event.stopPropagation();
    this.snippetService.toggleFavorite(snippet._id).subscribe({
      next: (res) => {
        snippet.isFavorite = res.data.isFavorite;
        if (this.tab === 'favorites') {
          this.allSnippets = this.allSnippets.map((s) =>
            s._id === snippet._id ? res.data : s,
          );
          this.applyFilters();
        }
      },
      error: () => this.toast.error('Error', 'Failed to update favorite.'),
    });
  }

  openLightbox(url: string): void {
    this.lightboxImage = url;
  }

  closeLightbox(): void {
    this.lightboxImage = null;
  }

  getViewImages(snippet: Snippet): any[] {
    return (snippet.attachments || []).filter(a => this.isImageFile(a));
  }

  getViewFiles(snippet: Snippet): any[] {
    return (snippet.attachments || []).filter(a => !this.isImageFile(a));
  }

  exportMarkdown(snippet: Snippet): void {
    const tagsLine = snippet.tags?.length ? `Tags: ${snippet.tags.join(', ')}` : '';
    const moduleLine = snippet.module ? `Module: ${snippet.module}` : '';
    const pageLine = snippet.page ? `Page: ${snippet.page}` : '';

    const md = `# ${snippet.title}

${snippet.description || ''}

${tagsLine ? `> ${tagsLine}  ` : ''}${moduleLine ? `> ${moduleLine}  ` : ''}${pageLine ? `> ${pageLine}  ` : ''}

## Instructions

${snippet.instructions || '_No instructions._'}

## Code

\`\`\`${snippet.language.toLowerCase()}
${snippet.code}
\`\`\`

---
*Created by ${snippet.createdBy} · ${new Date(snippet.createdAt).toLocaleDateString()}*
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snippet.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Form Modal ----

  openAdd(): void {
    this.editId = '';
    this.selectedFiles = [];
    this.editingAttachments = [];
    this.tagInput = '';
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEdit(snippet: Snippet): void {
    this.editId = snippet._id;
    this.selectedFiles = [];
    this.editingAttachments = snippet.attachments || [];
    this.tagInput = '';
    this.form = {
      title: snippet.title,
      description: snippet.description || '',
      instructions: snippet.instructions || '',
      code: snippet.code,
      language: snippet.language,
      tags: [...(snippet.tags || [])],
      module: snippet.module || '',
      page: snippet.page || '',
      isFavorite: snippet.isFavorite,
    };
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.editId = '';
    this.selectedFiles = [];
    this.editingAttachments = [];
    this.tagInput = '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  deleteSavedAttachment(fileName: string): void {
    if (!this.editId) return;
    if (!confirm('Delete this attachment?')) return;

    this.snippetService.deleteAttachment(this.editId, fileName).subscribe({
      next: (res) => {
        this.editingAttachments = res.data.attachments || [];
        this.allSnippets = this.allSnippets.map((s) =>
          s._id === this.editId ? res.data : s,
        );
        this.applyFilters();
      },
      error: (err) => alert(err?.error?.message || 'Attachment delete failed.'),
    });
  }

  addTag(event: KeyboardEvent | Event): void {
    const ev = event as KeyboardEvent;
    if (ev.key && ev.key !== 'Enter' && ev.key !== ',') return;
    ev.preventDefault();
    const val = this.tagInput.trim().replace(/,/g, '');
    if (val && !this.form.tags.includes(val)) {
      this.form.tags = [...this.form.tags, val];
    }
    this.tagInput = '';
  }

  removeTag(tag: string): void {
    this.form.tags = this.form.tags.filter((t) => t !== tag);
  }

  save(): void {
    if (this.saving) return;

    if (!this.form.title || !this.form.code) {
      alert('Title and Code are required.');
      return;
    }

    this.saving = true;

    const request = this.editId
      ? this.snippetService.update(this.editId, this.form, this.selectedFiles)
      : this.snippetService.create(this.form, this.selectedFiles);

    request.subscribe({
      next: (res) => {
        const saved = res.data;
        if (this.editId) {
          this.allSnippets = this.allSnippets.map((s) =>
            s._id === this.editId ? saved : s,
          );
        } else {
          this.allSnippets = [saved, ...this.allSnippets];
        }
        this.applyFilters();
        this.saving = false;
        this.closeModal();
        this.toast.success('Snippet saved', `"${saved.title}" ${this.editId ? 'updated' : 'created'}.`);
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message || 'Save failed.');
      },
    });
  }

  deleteSnippet(snippet: Snippet): void {
    if (!confirm(`Delete snippet: ${snippet.title}? This will permanently remove the snippet and all its files.`)) return;

    this.snippetService.delete(snippet._id).subscribe({
      next: () => {
        this.allSnippets = this.allSnippets.filter((s) => s._id !== snippet._id);
        this.applyFilters();
        this.toast.success('Snippet deleted', `"${snippet.title}" removed.`);
      },
      error: (err) => alert(err?.error?.message || 'Delete failed.'),
    });
  }

  // ---- Helpers ----

  getAttachmentUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.apiBase}${path}`;
  }

  isImageFile(file: any): boolean {
    return file?.mimeType?.startsWith('image/');
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileIcon(mimeType: string): string {
    if (mimeType?.startsWith('image/')) return '🖼';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) return '📦';
    return '📎';
  }

  badgeClass(value: string): string {
    return (value || '').toLowerCase().replace(/ /g, '-').replace('#', 'sharp');
  }

  langClass(language: string): string {
    return `lang-${(language || '').toLowerCase().replace(/ /g, '-').replace('#', 'sharp')}`;
  }

  private emptyForm(): SnippetPayload {
    return {
      title: '',
      description: '',
      instructions: '',
      code: '',
      language: 'JavaScript',
      tags: [],
      module: '',
      page: '',
      isFavorite: false,
    };
  }
}
