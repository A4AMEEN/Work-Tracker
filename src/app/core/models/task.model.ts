export type WorkingType = 'Frontend' | 'Backend' | 'Both';

export type TaskStatus =
  | 'Pending'
  | 'Working'
  | 'Done'
  | 'Backend Needed'
  | 'Testing'
  | 'Test Done'
  | 'Rework';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskAttachment {
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  date: string;
  day: string;
  module: string;
  page: string;
  description: string;
  workingType: WorkingType;
  status: TaskStatus;
  person: string;
  priority: Priority;
  remarks?: string;
deadlineDate?: string;
deadlineTime?: string;
deadlineAt?: string;
estimatedHours?: number;
  testedBy?: string;
  testRemarks?: string;
  reworkCount?: number;

  attachments?: TaskAttachment[];

  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isCarriedForward?: boolean;
}

export interface TaskPayload {
  date: string;
  module: string;
  page: string;
  description: string;
  workingType: WorkingType;
  status: TaskStatus;
  person: string;
  priority: Priority;
  remarks?: string;
  changeRemark?: string;
  deadlineDate?: string;
deadlineTime?: string;
estimatedHours?: number;
payload?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}