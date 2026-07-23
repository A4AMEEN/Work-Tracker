import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, Snippet, SnippetPayload } from '../models/snippet.model';

@Injectable({ providedIn: 'root' })
export class SnippetService {
  private api = `${environment.apiUrl}/snippets`;

  constructor(private http: HttpClient) {}

  getAll(filters: Record<string, string | undefined | null> = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ApiResponse<Snippet[]>>(this.api, { params });
  }

  getOne(id: string) {
    return this.http.get<ApiResponse<Snippet>>(`${this.api}/${id}`);
  }

  create(data: SnippetPayload, files: File[] = []) {
    return this.http.post<ApiResponse<Snippet>>(this.api, this.buildFormData(data, files));
  }

  update(id: string, data: SnippetPayload, files: File[] = []) {
    return this.http.put<ApiResponse<Snippet>>(`${this.api}/${id}`, this.buildFormData(data, files));
  }

  delete(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  toggleFavorite(id: string) {
    return this.http.patch<ApiResponse<Snippet>>(`${this.api}/${id}/favorite`, {});
  }

  markUsed(id: string) {
    return this.http.patch<ApiResponse<Snippet>>(`${this.api}/${id}/use`, {});
  }

  deleteAttachment(id: string, fileName: string) {
    return this.http.delete<ApiResponse<Snippet>>(
      `${this.api}/${id}/attachments/${encodeURIComponent(fileName)}`
    );
  }

  private buildFormData(data: SnippetPayload, files: File[]): FormData {
    const formData = new FormData();

    formData.append('title', data.title);
    formData.append('description', data.description || '');
    formData.append('instructions', data.instructions || '');
    formData.append('code', data.code);
    formData.append('language', data.language);
    formData.append('tags', JSON.stringify(data.tags || []));
    formData.append('module', data.module || '');
    formData.append('page', data.page || '');
    formData.append('isFavorite', String(data.isFavorite || false));

    files.forEach(file => formData.append('attachments', file));

    return formData;
  }
}
