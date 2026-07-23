export type SnippetLanguage =
  | 'TypeScript'
  | 'JavaScript'
  | 'HTML'
  | 'CSS'
  | 'SCSS'
  | 'C#'
  | 'SQL'
  | 'JSON'
  | 'Shell'
  | 'Other';

export interface SnippetAttachment {
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Snippet {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  code: string;
  language: SnippetLanguage;
  tags: string[];
  module: string;
  page: string;
  isFavorite: boolean;
  usageCount: number;
  createdBy: string;
  attachments: SnippetAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface SnippetPayload {
  title: string;
  description: string;
  instructions: string;
  code: string;
  language: SnippetLanguage;
  tags: string[];
  module: string;
  page: string;
  isFavorite: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
