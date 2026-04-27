import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, share } from "rxjs";
import { environment } from "../../../environments/environment";
import { ApiResponse, Task, TaskPayload, TaskStatus } from "../models/task.model";

@Injectable({ providedIn: "root" })
export class TaskService {
  private api = `${environment.apiUrl}/tasks`;
  private inflight = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  getTasks(filters: Record<string, string | number | undefined | null> = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params = params.set(key, String(value));
      }
    });
    return this.dedupe(`tasks:${params.toString()}`,
      this.http.get<ApiResponse<Task[]>>(this.api, { params })
    );
  }

  getTodayTasks() {
    return this.dedupe('tasks:today',
      this.http.get<ApiResponse<Task[]>>(`${this.api}/today`)
    );
  }

  getMyTasks() {
    return this.dedupe('tasks:my',
      this.http.get<ApiResponse<Task[]>>(`${this.api}/my-tasks`)
    );
  }

  createTask(data: TaskPayload, files: File[] = []) {
    return this.http.post<ApiResponse<Task>>(this.api, this.buildFormData(data, files));
  }

  updateTask(id: string, data: TaskPayload, files: File[] = []) {
    return this.http.put<ApiResponse<Task>>(`${this.api}/${id}`, this.buildFormData(data, files));
  }

  updateStatus(id: string, status: TaskStatus, remark = "") {
    return this.http.patch<ApiResponse<Task>>(`${this.api}/${id}/status`, { status, remark });
  }

  updateTestResult(id: string, passed: boolean, remark = "") {
    return this.http.patch<ApiResponse<Task>>(`${this.api}/${id}/test-result`, { passed, remark });
  }

  deleteAttachment(taskId: string, fileName: string) {
    return this.http.delete<ApiResponse<Task>>(`${this.api}/${taskId}/attachments/${fileName}`);
  }

  deleteTask(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  // prevents duplicate simultaneous requests for the same key
  private dedupe<T>(key: string, request$: Observable<T>): Observable<T> {
    if (this.inflight.has(key)) return this.inflight.get(key)!;
    const shared$ = request$.pipe(share());
    this.inflight.set(key, shared$);
    shared$.subscribe({ complete: () => this.inflight.delete(key), error: () => this.inflight.delete(key) });
    return shared$;
  }

  private buildFormData(data: TaskPayload, files: File[]): FormData {
    const formData = new FormData();
    formData.append("date", data.date);
    formData.append("module", data.module);
    formData.append("page", data.page);
    formData.append("description", data.description);
    formData.append("workingType", data.workingType);
    formData.append("status", data.status);
    formData.append("person", data.person);
    formData.append("priority", data.priority);
    formData.append("remarks", data.remarks || "");
    if (data.changeRemark) formData.append("changeRemark", data.changeRemark);
    files.forEach((file) => formData.append("attachments", file));
    return formData;
  }
}