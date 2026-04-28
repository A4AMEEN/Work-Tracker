export type BugSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type BugStatus =
  | 'Open'
  | 'Assigned'
  | 'Working'
  | 'Fixed'
  | 'Testing'
  | 'Reopened'
  | 'Closed';

export interface BugAttachment {
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Bug {
  _id: string;
  title: string;
  description: string;
  module: string;
  page: string;
  severity: BugSeverity;
  status: BugStatus;
  assignedTo: string;
  reportedBy: string;
  linkedTaskId?: string;
  attachments?: BugAttachment[];
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  payload?: any;
}

export interface BugPayload {
  title: string;
  description: string;
  module: string;
  page: string;
  severity: BugSeverity;
  status: BugStatus;
  assignedTo: string;
  remarks?: string;
  payload?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}