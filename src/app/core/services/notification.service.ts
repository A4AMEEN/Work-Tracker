import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AppNotification,
  NotificationResponse
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = `${environment.apiUrl}/notifications`;

  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly = false) {
    let params = new HttpParams();

    if (unreadOnly) {
      params = params.set('unread', 'true');
    }

    return this.http.get<NotificationResponse>(this.api, { params }).pipe(
      tap(res => this.unreadCount$.next(res.unreadCount || 0))
    );
  }

  refreshUnreadCount(): void {
    this.getNotifications(true).subscribe({
      next: (res) => this.unreadCount$.next(res.unreadCount || 0),
      error: () => this.unreadCount$.next(0)
    });
  }

  markAsRead(id: string) {
    return this.http.patch<ApiResponse<AppNotification>>(`${this.api}/${id}/read`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  markAllAsRead() {
    return this.http.patch<ApiResponse<null>>(`${this.api}/read-all`, {}).pipe(
      tap(() => this.unreadCount$.next(0))
    );
  }

  deleteNotification(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }
}