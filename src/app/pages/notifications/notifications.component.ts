import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  notifications: AppNotification[] = [];
  filtered: AppNotification[] = [];

  loading = false;
  error = '';
  unreadOnly = false;
  search = '';
  unreadCount = 0;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.error = '';

    this.notificationService.getNotifications(this.unreadOnly).subscribe({
      next: (res) => {
        this.notifications = res.data || [];
        this.unreadCount = res.unreadCount || 0;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load notifications.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const q = this.search.toLowerCase().trim();

    let result = [...this.notifications];

    if (q) {
      result = result.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q) ||
        n.createdBy?.toLowerCase().includes(q)
      );
    }

    this.filtered = result;
  }

  toggleUnread(): void {
    this.unreadOnly = !this.unreadOnly;
    this.loadNotifications();
  }

  markRead(notification: AppNotification): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification._id).subscribe({
      next: (res) => {
        this.notifications = this.notifications.map(n =>
          n._id === notification._id ? res.data : n
        );

        this.unreadCount = Math.max(this.unreadCount - 1, 0);
        this.applyFilters();
      }
    });
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({
          ...n,
          isRead: true
        }));

        this.unreadCount = 0;
        this.applyFilters();
      }
    });
  }

  deleteNotification(notification: AppNotification): void {
    if (!confirm('Delete this notification?')) return;

    this.notificationService.deleteNotification(notification._id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n._id !== notification._id);
        this.applyFilters();
      }
    });
  }

  openTarget(notification: AppNotification): void {
    this.markRead(notification);

    if (notification.targetType === 'Task') {
      this.router.navigate(['/tasks']);
      return;
    }

    if (notification.targetType === 'Bug') {
      this.router.navigate(['/bugs']);
      return;
    }
  }

  icon(type: string): string {
    const icons: Record<string, string> = {
      TASK_ASSIGNED: '✅',
      BUG_ASSIGNED: '🐞',
      DEADLINE_SOON: '⏰',
      TASK_OVERDUE: '🔥',
      BUG_TO_TASK: '🔁',
      REWORK: '🛠️',
      STATUS_UPDATE: '📌',
      GENERAL: '🔔'
    };

    return icons[type] || '🔔';
  }

  typeClass(type: string): string {
    return `type-${type.toLowerCase().replace(/_/g, '-')}`;
  }
}