import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { TaskService } from "../../core/services/task.service";
import { CacheService } from "../../core/services/cache.service";
import { NotificationService } from "../../core/services/notification.service";
import { Router } from '@angular/router';
import {
  Priority,
  Task,
  TaskPayload,
  TaskStatus,
  WorkingType,
} from "../../core/models/task.model";
import { environment } from "../../../environments/environment";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";

type TaskView = "all" | "today" | "pending" | "done" | "backend" | "my";

@Component({
  selector: "app-tasks",
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: "./tasks.component.html",
  styleUrl: "./tasks.component.scss",
})
export class TasksComponent implements OnInit, OnDestroy {
  title = "Tasks";
  view: TaskView = "all";

  allTasks: Task[] = [];
  tasks: Task[] = [];
  loading = false;
  saving = false;
  error = "";

  apiBase = environment.apiUrl.replace("/api", "");
  selectedFiles: File[] = [];
  editingTaskAttachments: any[] = [];

  showModal = false;
  editId = "";
  tooltipVisible = false;
  tooltipText = "";
  tooltipX = 0;
  tooltipY = 0;

  showRemarkModal = false;
  remarkTitle = "";
  remarkPlaceholder = "";
  remarkText = "";
  remarkAction: null | (() => void) = null;
  remarkSaving = false;

  filters = {
    search: "",
    date: "",
    person: "",
    module: "",
    status: "",
    priority: "",
    workingType: "",
  };

  persons = ["Ansari", "Ameen", "Kaviya", "Rajeena", "Rohan"];
  statuses: TaskStatus[] = [
    "Pending",
    "Working",
    "Backend Needed",
    "Testing",
    "Test Done",
    "Rework",
    "Done",
  ];
  priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
  workingTypes: WorkingType[] = ["Frontend", "Backend", "Both"];
  quickFilter = "all";
  form: TaskPayload = this.emptyForm();

  private searchSubject = new Subject<void>();
  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private taskService: TaskService,
    private cache: CacheService,
    public notificationService: NotificationService,
     private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.searchSubject
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.applyClientFilters()),
    );

    this.subs.add(
      this.route.data.subscribe((data) => {
        this.view = data["view"] || "all";
        this.title = data["title"] || "Tasks";
        this.resetFilters();
        this.loadTasks();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private cacheKey(): string {
    return `tasks:${this.view}`;
  }

  loadTasks(forceRefresh = false): void {
    const key = this.cacheKey();

    // show cached data immediately — zero wait
    if (!forceRefresh) {
      const cached = this.cache.get<Task[]>(key);
      if (cached) {
        this.allTasks = cached;
        this.applyClientFilters();
        // still refresh in background silently
        this.fetchFromApi(key, true);
        return;
      }
    }

    // no cache — show spinner and fetch
    this.loading = true;
    this.fetchFromApi(key, false);
  }

  private fetchFromApi(key: string, silent: boolean): void {
    this.error = "";

    let request$;

    if (this.view === "today") {
      request$ = this.taskService.getTodayTasks();
    } else if (this.view === "my") {
      request$ = this.taskService.getMyTasks();
    } else {
      const apiFilters: any = { limit: 500 };
      if (this.view === "pending") apiFilters.status = "Pending";
      if (this.view === "done") apiFilters.status = "Done";
      if (this.view === "backend") apiFilters.status = "Backend Needed";
      request$ = this.taskService.getTasks(apiFilters);
    }

    request$.subscribe({
      next: (res: any) => {
        const fresh = res.data || [];
        this.cache.set(key, fresh, 60_000); // cache for 60 seconds
        this.allTasks = fresh;
        this.applyClientFilters();
        if (!silent) this.loading = false;
      },
      error: (err: any) => {
        if (!silent) {
          this.error = err?.error?.message || "Failed to load tasks.";
          this.loading = false;
        }
      },
    });
  }

  applyFilters(): void {
    this.searchSubject.next();
  }

  applyFiltersInstant(): void {
    this.applyClientFilters();
  }

  private applyClientFilters(): void {
    let result = [...this.allTasks];
    const { search, date, person, module, status, priority, workingType } =
      this.filters;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.module?.toLowerCase().includes(q) ||
          t.page?.toLowerCase().includes(q) ||
          t.person?.toLowerCase().includes(q) ||
          t.remarks?.toLowerCase().includes(q),
      );
    }

    if (date) result = result.filter((t) => t.date === date);
    if (person) result = result.filter((t) => t.person === person);
    if (module)
      result = result.filter((t) =>
        t.module?.toLowerCase().includes(module.toLowerCase()),
      );
    if (priority) result = result.filter((t) => t.priority === priority);
    if (workingType)
      result = result.filter((t) => t.workingType === workingType);

    if (this.quickFilter !== "all") {
      result = result.filter((t) => t.status === this.quickFilter);
    } else if (status) {
      result = result.filter((t) => t.status === status);
    }

    this.tasks = result;
  }

  setQuickFilter(value: string): void {
    this.quickFilter = value;
    this.applyClientFilters();
  }

  resetFilters(): void {
    this.filters = {
      search: "",
      date: "",
      person: "",
      module: "",
      status: "",
      priority: "",
      workingType: "",
    };
    this.quickFilter = "all";
  }

  clearFilters(): void {
    this.resetFilters();
    this.applyClientFilters();
  }

  openAddTask(): void {
    this.editId = "";
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
      remarks: task.remarks || "",
      deadlineDate: task.deadlineDate || "",
      deadlineTime: task.deadlineTime || "",
      estimatedHours: task.estimatedHours || 0,
    };

    this.showModal = true;
  }

  closeTaskModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.selectedFiles = [];
    this.editingTaskAttachments = [];
    this.editId = "";
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
    if (
      !this.form.date ||
      !this.form.module ||
      !this.form.page ||
      !this.form.description
    ) {
      alert("Please fill all required fields.");
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
          this.allTasks = this.allTasks.map((t) =>
            t._id === this.editId ? savedTask : t,
          );
        } else {
          this.allTasks = [savedTask, ...this.allTasks];
        }
        // invalidate cache so other tabs see fresh data
        this.cache.invalidatePrefix("tasks:");
        this.cache.set(this.cacheKey(), this.allTasks, 60_000);
        this.applyClientFilters();
        this.saving = false;
        this.showModal = false;
        this.selectedFiles = [];
        this.editingTaskAttachments = [];
        this.editId = "";
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message || "Save failed.");
      },
    });
  }

  showTooltip(event: MouseEvent, text: string): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.tooltipText = text;
    this.tooltipX = rect.left;
    this.tooltipY = rect.bottom + 8;
    this.tooltipVisible = true;
  }

  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  updateStatus(task: Task, status: TaskStatus): void {
    if (task.status === status) return;
    this.openRemarkModal(
      "Update Status",
      `Add remark for "${status}"...`,
      () => {
        this.remarkSaving = true;
        this.taskService
          .updateStatus(task._id, status, this.remarkText)
          .subscribe({
            next: (res) => {
              this.allTasks = this.allTasks.map((t) =>
                t._id === task._id ? res.data : t,
              );
              this.cache.invalidatePrefix("tasks:");
              this.applyClientFilters();
              this.remarkSaving = false;
              this.closeRemarkModal();
            },
            error: (err) => {
              this.remarkSaving = false;
              alert(err?.error?.message || "Status update failed.");
            },
          });
      },
    );
  }

  goToNotifications() {
    this.router.navigate(["/notifications"]);
  }

  markTestResult(task: Task, passed: boolean): void {
    this.openRemarkModal(
      passed ? "Test Passed" : "Test Failed",
      passed ? "Add test passed remark..." : "Explain what failed...",
      () => {
        this.remarkSaving = true;
        this.taskService
          .updateTestResult(task._id, passed, this.remarkText)
          .subscribe({
            next: (res) => {
              this.allTasks = this.allTasks.map((t) =>
                t._id === task._id ? res.data : t,
              );
              this.cache.invalidatePrefix("tasks:");
              this.applyClientFilters();
              this.remarkSaving = false;
              this.closeRemarkModal();
            },
            error: (err) => {
              this.remarkSaving = false;
              alert(err?.error?.message || "Test update failed.");
            },
          });
      },
    );
  }

  deleteSavedAttachment(fileName: string): void {
    if (!this.editId) return;
    if (!confirm("Delete this attachment?")) return;
    this.taskService.deleteAttachment(this.editId, fileName).subscribe({
      next: (res) => {
        this.editingTaskAttachments = res.data.attachments || [];
        this.allTasks = this.allTasks.map((t) =>
          t._id === this.editId ? res.data : t,
        );
        this.cache.invalidatePrefix("tasks:");
        this.applyClientFilters();
      },
      error: (err) => alert(err?.error?.message || "Attachment delete failed."),
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete task: ${task.description}?`)) return;
    this.taskService.deleteTask(task._id).subscribe({
      next: () => {
        this.allTasks = this.allTasks.filter((t) => t._id !== task._id);
        this.cache.invalidatePrefix("tasks:");
        this.applyClientFilters();
      },
      error: (err) =>
        alert(err?.error?.message || "Delete failed. Admin only."),
    });
  }

  openRemarkModal(
    title: string,
    placeholder: string,
    action: () => void,
  ): void {
    this.remarkTitle = title;
    this.remarkPlaceholder = placeholder;
    this.remarkText = "";
    this.remarkAction = action;
    this.showRemarkModal = true;
  }

  confirmRemark(): void {
    if (this.remarkSaving) return;
    if (this.remarkAction) this.remarkAction();
  }

  closeRemarkModal(): void {
    if (this.remarkSaving) return;
    this.showRemarkModal = false;
    this.remarkText = "";
    this.remarkAction = null;
    this.remarkSaving = false;
  }

  getAttachmentUrl(path: string): string {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${this.apiBase}${path}`;
  }

  exportCSV(): void {
    const rows = this.tasks.map((t) => ({
      date: t.date,
      day: t.day,
      module: t.module,
      page: t.page,
      description: t.description,
      workingType: t.workingType,
      status: t.status,
      priority: t.priority,
      person: t.person,
      remarks: t.remarks || "",
      reworkCount: t.reworkCount || 0,
      testRemarks: t.testRemarks || "",
    }));
    if (!rows.length) return;
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((row) =>
        header.map((key) => JSON.stringify((row as any)[key] || "")).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "worktrack-tasks.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  badgeClass(value: string): string {
    return value.toLowerCase().replace(/ /g, "-");
  }

  isPreviewable(mimeType?: string): boolean {
    if (!mimeType) return false;
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/")
    );
  }

  isTextFile(file: any): boolean {
    return (
      file?.mimeType?.startsWith("text/") ||
      file?.originalName?.toLowerCase().endsWith(".txt")
    );
  }

  openAttachment(file: any): void {
    const url = this.getAttachmentUrl(file.filePath);
    if (this.isTextFile(file)) {
      fetch(url)
        .then((res) => res.text())
        .then((text) => {
          const w = window.open("", "_blank");
          if (w) {
            w.document.write(`<html><head><title>${file.originalName}</title>
            <style>body{background:#0a0c10;color:#e8eaf0;font-family:monospace;padding:24px;white-space:pre-wrap;line-height:1.6}</style>
            </head><body>${this.escapeHtml(text)}</body></html>`);
            w.document.close();
          }
        });
      return;
    }
    window.open(url, "_blank");
  }

  escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  getDeadlineClass(task: Task): string {
    if (task.status === "Done" || task.status === "Test Done")
      return "deadline-done";
    if (!task.deadlineAt) return "deadline-none";

    const now = new Date().getTime();
    const due = new Date(task.deadlineAt).getTime();
    const diff = due - now;

    if (diff < 0) return "deadline-overdue";
    if (diff <= 4 * 60 * 60 * 1000) return "deadline-warning";

    return "deadline-safe";
  }

  getDeadlineText(task: Task): string {
    if (!task.deadlineAt) return "No deadline";
    if (task.status === "Done" || task.status === "Test Done")
      return "Completed";

    const now = new Date().getTime();
    const due = new Date(task.deadlineAt).getTime();
    const diff = due - now;

    if (diff < 0) {
      const hours = Math.ceil(Math.abs(diff) / (1000 * 60 * 60));
      return `Overdue by ${hours}h`;
    }

    const hours = Math.ceil(diff / (1000 * 60 * 60));

    if (hours <= 24) return `${hours}h left`;

    const days = Math.ceil(hours / 24);
    return `${days}d left`;
  }

  private emptyForm(): TaskPayload {
    const today = new Date().toISOString().split("T")[0];
    return {
      date: today,
      module: "",
      page: "",
      description: "",
      workingType: "Frontend",
      status: "Pending",
      person: this.auth.currentUser()?.name || "Ameen",
      priority: "Medium",
      remarks: "",
      deadlineDate: "",
      deadlineTime: "",
      estimatedHours: 0,
    };
  }
}
