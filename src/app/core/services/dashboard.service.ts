import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getDashboard() {
    return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/dashboard`);
  }
}
