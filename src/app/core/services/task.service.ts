import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import {
  ApiResponse,
  Task,
  TaskPayload,
  TaskStatus,
} from "../models/task.model";

@Injectable({ providedIn: "root" })
export class TaskService {
  private api = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(filters: Record<string, string | number | undefined | null> = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ApiResponse<Task[]>>(this.api, { params });
  }

  getTodayTasks() {
    return this.http.get<ApiResponse<Task[]>>(`${this.api}/today`);
  }

  getMyTasks() {
    return this.http.get<ApiResponse<Task[]>>(`${this.api}/my-tasks`);
  }

  createTask(data: TaskPayload, files: File[] = []) {
    const formData = this.buildFormData(data, files);
    return this.http.post<ApiResponse<Task>>(this.api, formData);
  }

  updateTask(id: string, data: TaskPayload, files: File[] = []) {
    const formData = this.buildFormData(data, files);
    return this.http.put<ApiResponse<Task>>(`${this.api}/${id}`, formData);
  }

  updateStatus(id: string, status: TaskStatus, remark = "") {
    return this.http.patch<ApiResponse<Task>>(`${this.api}/${id}/status`, {
      status,
      remark,
    });
  }

  deleteAttachment(taskId: string, fileName: string) {
    return this.http.delete<ApiResponse<Task>>(
      `${this.api}/${taskId}/attachments/${fileName}`,
    );
  }

  updateTestResult(id: string, passed: boolean, remark = "") {
    return this.http.patch<ApiResponse<Task>>(`${this.api}/${id}/test-result`, {
      passed,
      remark,
    });
  }

  deleteTask(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
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

    if (data.changeRemark) {
      formData.append("changeRemark", data.changeRemark);
    }

    files.forEach((file) => {
      formData.append("attachments", file);
    });

    return formData;
  }
}
