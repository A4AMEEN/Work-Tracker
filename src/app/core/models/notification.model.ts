export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'BUG_ASSIGNED'
  | 'DEADLINE_SOON'
  | 'TASK_OVERDUE'
  | 'BUG_TO_TASK'
  | 'REWORK'
  | 'STATUS_UPDATE'
  | 'GENERAL';

export type NotificationTargetType = 'Task' | 'Bug' | 'General';

export interface AppNotification {
  _id: string;
  userName: string;
  title: string;
  message: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetId?: string;
  isRead: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationResponse {
  success: boolean;
  data: AppNotification[];
  unreadCount: number;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}