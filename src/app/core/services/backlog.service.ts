import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, Backlog, BacklogPayload } from '../models/backlog.model';

@Injectable({ providedIn: 'root' })
export class BacklogService {
  private api = `${environment.apiUrl}/backlogs`;

  constructor(private http: HttpClient) {}

  getBacklogs() {
    return this.http.get<ApiResponse<Backlog[]>>(this.api);
  }

  createBacklog(data: BacklogPayload, files: File[] = []) {
    return this.http.post<ApiResponse<Backlog>>(this.api, this.buildFormData(data, files));
  }

  updateBacklog(id: string, data: BacklogPayload, files: File[] = []) {
    return this.http.put<ApiResponse<Backlog>>(`${this.api}/${id}`, this.buildFormData(data, files));
  }

  deleteBacklog(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  deleteAttachment(backlogId: string, fileName: string) {
    return this.http.delete<ApiResponse<Backlog>>(
      `${this.api}/${backlogId}/attachments/${encodeURIComponent(fileName)}`
    );
  }

  private buildFormData(data: BacklogPayload, files: File[]): FormData {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('module', data.module || '');
    formData.append('page', data.page || '');
    formData.append('fromUser', data.fromUser || '');
    formData.append('remarks', data.remarks || '');
    files.forEach(file => formData.append('attachments', file));
    return formData;
  }
}
