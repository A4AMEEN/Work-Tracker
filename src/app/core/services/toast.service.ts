import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  icon: string;
  title: string;
  message: string;
  duration?: number;
}

function beep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  private show(icon: string, title: string, message: string, duration = 10000): void {
    const id = Math.random().toString(36).slice(2);
    this.toasts.update(list => [...list, { id, icon, title, message, duration }]);
    beep();
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  success(title: string, message: string): void {
    this.show('✅', title, message);
  }

  info(title: string, message: string): void {
    this.show('ℹ️', title, message);
  }

  warning(title: string, message: string): void {
    this.show('⚠️', title, message);
  }

  error(title: string, message: string): void {
    this.show('❌', title, message);
  }

  taskAssigned(description: string): void {
    this.show('📋', 'Task Assigned', description);
  }

  taskCompleted(description: string): void {
    this.show('✅', 'Task Completed', description);
  }

  taskApproved(description: string): void {
    this.show('✅', 'Task Approved', description);
  }

  taskPendingApproval(description: string): void {
    this.show('⏳', 'Pending Approval', description);
  }

  reworkRequested(description: string): void {
    this.show('🔄', 'Rework Requested', description);
  }

  bugConverted(title: string): void {
    this.show('🐞', 'Bug Converted', title);
  }
}
