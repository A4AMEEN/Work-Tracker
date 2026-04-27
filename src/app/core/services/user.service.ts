import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/task.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getUsers() {
    return this.http.get<ApiResponse<User[]>>(`${environment.apiUrl}/users`);
  }

  createUser(data: any) {
    return this.http.post<ApiResponse<User>>(`${environment.apiUrl}/users`, data);
  }

  updateUser(id: string, data: any) {
    return this.http.put<ApiResponse<User>>(`${environment.apiUrl}/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/users/${id}`);
  }
}
