import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" (click)="toastService.dismiss(toast.id)">
          <div class="toast-icon">{{ toast.icon }}</div>
          <div class="toast-body">
            <div class="toast-title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #1c1c1e;
      border: 1px solid #2c2c2e;
      border-radius: 14px;
      padding: 14px 18px;
      min-width: 300px;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .toast:hover { opacity: 0.85; }
    .toast-icon { font-size: 22px; line-height: 1.3; flex-shrink: 0; }
    .toast-body { min-width: 0; }
    .toast-title { font-size: 14px; font-weight: 700; color: #f5f5f7; }
    .toast-message { font-size: 12.5px; color: #a1a1a6; margin-top: 2px; line-height: 1.4; }
    @keyframes toastIn {
      from { transform: translateX(120%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
