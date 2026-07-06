export interface BacklogAttachment {
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Backlog {
  _id: string;
  title: string;
  module: string;
  page: string;
  description: string;
  createdBy: string;
  fromUser: string;
  remarks?: string;
  attachments?: BacklogAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BacklogPayload {
  title: string;
  module: string;
  page: string;
  description: string;
  fromUser: string;
  remarks?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
