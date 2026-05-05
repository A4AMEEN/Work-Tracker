import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { ApiResponse } from "../models/task.model";

@Injectable({ providedIn: "root" })
export class ReportService {
  constructor(private http: HttpClient) {}

  getSummary(filters: Record<string, string> = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });

    return this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/reports/summary`,
      { params },
    );
  }

getDailyReport(date: string, mode = 'taskDate', person = '') {
  let params = new HttpParams()
    .set('date', date)
    .set('mode', mode);

  if (person) {
    params = params.set('person', person);
  }

  return this.http.get<any>(`${environment.apiUrl}/reports/daily`, { params });
}
}
