import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/task.model';
import { TaskHistory } from '../models/history.model';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  constructor(private http: HttpClient) {}

  getHistory(filters: { person?: string; date?: string; taskId?: string } = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });

    return this.http.get<ApiResponse<TaskHistory[]>>(`${environment.apiUrl}/history`, { params });
  }
}
