import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, Bug, BugPayload, BugStatus } from '../models/bug.model';

@Injectable({ providedIn: 'root' })
export class BugService {
  private api = `${environment.apiUrl}/bugs`;

  constructor(private http: HttpClient) {}

  getBugs(filters: Record<string, string | undefined | null> = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ApiResponse<Bug[]>>(this.api, { params });
  }

  createBug(data: BugPayload, files: File[] = []) {
    return this.http.post<ApiResponse<Bug>>(this.api, this.buildFormData(data, files));
  }

  updateBug(id: string, data: BugPayload, files: File[] = []) {
    return this.http.put<ApiResponse<Bug>>(`${this.api}/${id}`, this.buildFormData(data, files));
  }

  updateStatus(id: string, status: BugStatus, remark = '') {
    return this.http.patch<ApiResponse<Bug>>(`${this.api}/${id}/status`, {
      status,
      remark
    });
  }

  convertToTask(id: string, assignTo: string) {
    return this.http.post<ApiResponse<any>>(`${this.api}/${id}/convert-to-task`, {
      assignTo
    });
  }

  deleteBug(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  private buildFormData(data: BugPayload, files: File[]): FormData {
    const formData = new FormData();

    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('module', data.module || '');
    formData.append('page', data.page || '');
    formData.append('severity', data.severity);
    formData.append('status', data.status);
    formData.append('assignedTo', data.assignedTo || '');
    formData.append('remarks', data.remarks || '');

    files.forEach(file => formData.append('attachments', file));

    return formData;
  }
}