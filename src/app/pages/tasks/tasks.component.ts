import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { TaskService } from "../../core/services/task.service";
import { CacheService } from "../../core/services/cache.service";
import { NotificationService } from "../../core/services/notification.service";
import { SocketService } from "../../core/services/socket.service";
import { Router } from "@angular/router";
import {
  Priority,
  Subtask,
  Task,
  TaskPayload,
  TaskStatus,
  WorkingType,
} from "../../core/models/task.model";
import { environment } from "../../../environments/environment";
import { Subject, Subscription, interval } from "rxjs";
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

  showViewModal = false;
  viewTask: Task | null = null;

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
  editingStatusTaskId = "";
  tempStatus: TaskStatus = "Pending";
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

  // Multi-assign states
  multiAssignMode = false;
  selectedPersons: string[] = [];
  subtaskEntries: { description: string; assignedTo: string }[] = [];
  showSubtaskPopup = false;
  viewSubtaskTask: Task | null = null;
  completingSubtaskId = "";
  personDropdownOpen = false;

  form: TaskPayload = this.emptyForm();

  private searchSubject = new Subject<void>();
  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private taskService: TaskService,
    private cache: CacheService,
    public notificationService: NotificationService,
    private socket: SocketService,
    private router: Router,
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

        if (this.view === "today") {
          this.filters.date = this.todayDate();
        }

        this.loadTasks();
      }),
    );

    this.subs.add(
      this.socket.onTaskUpdated().subscribe((updated) => {
        const idx = this.allTasks.findIndex(t => t._id === updated._id);
        if (idx !== -1) {
          this.allTasks[idx] = updated;
          this.cache.invalidatePrefix("tasks:");
          this.applyClientFilters();
        }
      }),
    );

    this.subs.add(
      this.socket.onTaskDeleted().subscribe((id) => {
        this.allTasks = this.allTasks.filter(t => t._id !== id);
        this.cache.invalidatePrefix("tasks:");
        this.applyClientFilters();
      }),
    );

    // Polling fallback for Vercel (socket.io unavailable) — refreshes every 30s
    this.subs.add(
      interval(30_000).subscribe(() => {
        this.cache.invalidatePrefix("tasks:");
        this.fetchFromApi(this.cacheKey(), true);
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
  if (this.filters.date && this.filters.date !== this.todayDate()) {
    request$ = this.taskService.getTasks({
      date: this.filters.date,
      limit: 500
    });
  } else {
    request$ = this.taskService.getTodayTasks();
  }
} else if (this.view === "my") {
      request$ = this.taskService.getMyTasks();
    } else {
      const apiFilters: any = { limit: 500 };
      if (this.view === "pending") apiFilters.status = "Pending";
      if (this.view === "done") apiFilters.status = "Done,Completed";
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
      if (this.quickFilter === "Done") {
        result = result.filter((t) => t.status === "Done" || t.status === "Completed");
      } else {
        result = result.filter((t) => t.status === this.quickFilter);
      }
    } else if (status) {
      result = result.filter((t) => t.status === status);
    }

    if (this.view === "today") {
      result = result.sort((a, b) => {
        const aTime = new Date(a.deadlineAt || `${a.date}T00:00:00`).getTime();
        const bTime = new Date(b.deadlineAt || `${b.date}T00:00:00`).getTime();
        return aTime - bTime;
      });
    }
    const statusRank: Record<string, number> = {
      Pending: 1,
      Working: 2,
      "Backend Needed": 3,
      Testing: 4,
      "Test Done": 5,
      Rework: 6,
      Done: 7,
      Completed: 8,
    };

    result = result.sort((a, b) => {
      // My Tasks + Today: active tasks top, done bottom
      if (this.view === "my" || this.view === "today") {
        const rankA = statusRank[a.status] || 99;
        const rankB = statusRank[b.status] || 99;
        if (rankA !== rankB) return rankA - rankB;

        // Pending: newest first
        if (a.status === "Pending" && b.status === "Pending") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }

        // Done/Completed: most recent first
        if (rankA >= 7) {
          const aTime = new Date(a.completedAt || a.updatedAt || 0).getTime();
          const bTime = new Date(b.completedAt || b.updatedAt || 0).getTime();
          return bTime - aTime;
        }

        const aTime = new Date(a.deadlineAt || `${a.date}T00:00:00`).getTime();
        const bTime = new Date(b.deadlineAt || `${b.date}T00:00:00`).getTime();
        return aTime - bTime;
      }

      // All tasks: keep normal latest list
      return 0;
    });

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

  openViewTask(task: Task): void {
    this.viewTask = task;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewTask = null;
  }

  openAddTask(): void {
    this.editId = "";
    this.selectedFiles = [];
    this.editingTaskAttachments = [];
    this.multiAssignMode = false;
    this.selectedPersons = [this.auth.currentUser()?.name || "Ameen"];
    this.subtaskEntries = [];
    this.personDropdownOpen = false;
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEditTask(task: Task): void {
    this.editId = task._id;
    this.selectedFiles = [];
    this.editingTaskAttachments = task.attachments || [];

    if (task.isMultiAssignment) {
      this.multiAssignMode = true;
      const assignedFromSubtask = [...new Set((task.subtasks || []).map(st => st.assignedTo).filter(Boolean))];
      this.selectedPersons = (task.assignedUsers && task.assignedUsers.length > 0)
        ? [...task.assignedUsers]
        : assignedFromSubtask;
      this.subtaskEntries = (task.subtasks || []).map(st => ({
        description: st.description,
        assignedTo: st.assignedTo,
      }));
      this.form = {
        ...this.emptyForm(),
        description: task.taskTitle || task.description || "",
        taskTitle: task.taskTitle || "",
        isMultiAssignment: true,
        assignedUsers: [...this.selectedPersons],
        subtasks: this.subtaskEntries,
      };
    } else {
      this.multiAssignMode = false;
      this.selectedPersons = [];
      this.subtaskEntries = [];
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
        payload: "",
        approverUserId: task.approverUserId || "",
      };
    }

    this.showModal = true;
  }

  closeTaskModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.selectedFiles = [];
    this.editingTaskAttachments = [];
    this.editId = "";
    this.multiAssignMode = false;
    this.selectedPersons = [];
    this.subtaskEntries = [];
    this.personDropdownOpen = false;
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

    if (this.multiAssignMode) {
      if (!this.form.date || !this.form.module || !this.form.page) {
        alert("Please fill all required fields.");
        return;
      }
      if (!this.form.taskTitle || !this.form.taskTitle.trim()) {
        alert("Please enter a task title.");
        return;
      }
      if (this.subtaskEntries.length === 0 || this.subtaskEntries.some(e => !e.description.trim())) {
        alert("Please add at least one subtask with a description.");
        return;
      }
      if (this.selectedPersons.length < 2) {
        alert("Select at least 2 users for multi-assignment.");
        return;
      }

      this.form.isMultiAssignment = true;
      this.form.assignedUsers = this.selectedPersons;
      this.form.subtasks = this.subtaskEntries.map(e => ({
        description: e.description.trim(),
        assignedTo: e.assignedTo,
      }));
      this.form.description = this.form.taskTitle.trim();
      this.form.person = this.selectedPersons[0];
    } else {
      if (
        !this.form.date ||
        !this.form.module ||
        !this.form.page ||
        !this.form.description
      ) {
        alert("Please fill all required fields.");
        return;
      }
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

  startStatusEdit(task: Task): void {
    this.editingStatusTaskId = task._id;
    this.tempStatus = task.status;
  }
  async pastePayload(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.form.payload = text || "";
    } catch {
      alert("Clipboard access denied");
    }
  }

  formatPayload(): void {
    try {
      const parsed = JSON.parse(this.form.payload);
      this.form.payload = JSON.stringify(parsed, null, 2);
    } catch {
      alert("Invalid JSON");
    }
  }

  copyPayload(): void {
    navigator.clipboard.writeText(this.form.payload || "");
  }

  downloadPayload(): void {
    const blob = new Blob([this.form.payload || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "payload.txt";
    a.click();

    URL.revokeObjectURL(url);
  }
  // cancelStatusEdit(): void {
  //   this.editingStatusTaskId = "";
  //   this.tempStatus = "Pending";
  // }

  // saveInlineStatus(task: Task): void {
  //   if (task.status === this.tempStatus) {
  //     this.cancelStatusEdit();
  //     return;
  //   }

  //   this.taskService
  //     .updateStatus(task._id, this.tempStatus, "Status updated from My Tasks")
  //     .subscribe({
  //       next: (res) => {
  //         this.allTasks = this.allTasks.map((t) =>
  //           t._id === task._id ? res.data : t,
  //         );
  //         this.cache.invalidatePrefix("tasks:");
  //         this.applyClientFilters();
  //         this.cancelStatusEdit();
  //       },
  //       error: (err) => alert(err?.error?.message || "Status update failed."),
  //     });
  // }

  onStatusChange(task: Task, newStatus: TaskStatus): void {
    if (task.status === newStatus) {
      this.editingStatusTaskId = "";
      return;
    }

    this.taskService
      .updateStatus(task._id, newStatus, "Updated from My Tasks")
      .subscribe({
        next: (res) => {
          this.allTasks = this.allTasks.map((t) =>
            t._id === task._id ? res.data : t,
          );

          this.cache.invalidatePrefix("tasks:");
          this.applyClientFilters();

          this.editingStatusTaskId = "";
        },
        error: (err) => {
          alert(err?.error?.message || "Status update failed.");
          this.editingStatusTaskId = "";
        },
      });
  }
  private todayDate(): string {
    return new Date().toISOString().split("T")[0];
  }
  getDeadlineText(task: Task): string {
    if (!task.deadlineAt) return "No deadline";
    if (task.status === "Done" || task.status === "Test Done" || task.status === "Completed")
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
      approverUserId: "",
      taskTitle: "",
      isMultiAssignment: false,
      assignedUsers: [],
      subtasks: [],
    };
  }

  // ---- Multi-assign methods ----

  updateAssigneeSelection(person: string, checked: boolean): void {
    if (checked) {
      this.selectedPersons = [...this.selectedPersons, person];
    } else if (this.selectedPersons.length > 1) {
      this.selectedPersons = this.selectedPersons.filter(p => p !== person);
    } else {
      return; // must keep at least one selected
    }

    const wasMulti = this.multiAssignMode;
    this.multiAssignMode = this.selectedPersons.length > 1;

    // Single mode: keep form.person in sync
    if (!this.multiAssignMode) {
      this.form.person = this.selectedPersons[0];
      this.onPersonChange(this.form.person);
    }

    // Auto-switch: transform single description into first subtask
    if (this.multiAssignMode && !wasMulti && this.subtaskEntries.length === 0) {
      this.subtaskEntries = [{
        description: this.form.description || "",
        assignedTo: this.selectedPersons[0],
      }];
      this.form.description = "";
    }

    // When going back to single mode, restore description from first subtask if any
    if (!this.multiAssignMode && wasMulti && this.subtaskEntries.length > 0) {
      this.form.description = this.subtaskEntries[0].description;
      this.subtaskEntries = [];
    }

    // Ensure each subtask's assignedTo is still valid
    this.subtaskEntries = this.subtaskEntries.filter(e => this.selectedPersons.includes(e.assignedTo));
  }

  addSubtaskRow(): void {
    const unassigned = this.selectedPersons.find(p => !this.subtaskEntries.some(e => e.assignedTo === p));
    this.subtaskEntries = [
      ...this.subtaskEntries,
      { description: "", assignedTo: unassigned || this.selectedPersons[0] },
    ];
  }

  removeSubtaskRow(index: number): void {
    this.subtaskEntries = this.subtaskEntries.filter((_, i) => i !== index);
  }

  openSubtaskPopup(task: Task): void {
    this.viewSubtaskTask = task;
    this.showSubtaskPopup = true;
  }

  closeSubtaskPopup(): void {
    this.showSubtaskPopup = false;
    this.viewSubtaskTask = null;
    this.completingSubtaskId = "";
  }

  completeSubtask(task: Task, subtaskId: string, isCompleted: boolean): void {
    this.completingSubtaskId = subtaskId;
    this.taskService.completeSubtask(task._id, subtaskId, isCompleted).subscribe({
      next: (res) => {
        const updated = res.data;
        this.allTasks = this.allTasks.map(t => t._id === updated._id ? updated : t);
        this.cache.invalidatePrefix("tasks:");
        if (this.viewSubtaskTask?._id === updated._id) {
          this.viewSubtaskTask = updated;
        }
        this.applyClientFilters();
        this.completingSubtaskId = "";
      },
      error: (err) => {
        this.completingSubtaskId = "";
        alert(err?.error?.message || "Failed to update subtask.");
      },
    });
  }

  isSubtasksAllDone(task: Task): boolean {
    return !!(
      task.isMultiAssignment &&
      task.subtasks &&
      task.subtasks.length > 0 &&
      task.subtasks.every(st => st.isCompleted)
    );
  }

  completeSubtaskFromEvent(task: Task, subtaskId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.completeSubtask(task, subtaskId, checked);
  }

  updateAssigneeSelectionFromEvent(person: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateAssigneeSelection(person, checked);
  }

  togglePersonDropdown(): void {
    this.personDropdownOpen = !this.personDropdownOpen;
  }

  canCompleteSubtask(subtask: Subtask): boolean {
    return (
      this.auth.isAdmin() ||
      subtask.assignedTo === this.auth.currentUser()?.name
    );
  }

  get approverOptions(): string[] {
    return this.persons.filter(p => p !== this.form.person);
  }

  onPersonChange(person: string): void {
    if (this.multiAssignMode) return;
    const currentUser = this.auth.currentUser()?.name;
    this.form.approverUserId = person === currentUser ? "" : "";
  }

  canEditTaskStatus(task: Task): boolean {
  if (task.status === "Completed") return false;

  const currentUser = this.auth.currentUser()?.name;

  return (
    this.auth.isAdmin() ||
    task.person === currentUser ||
    task.createdBy === currentUser
  );
}

tryStartStatusEdit(task: Task): void {
  if (!this.canEditTaskStatus(task)) {
    alert("You can update only tasks assigned to you or created by you.");
    return;
  }

  this.startStatusEdit(task);
}
}
