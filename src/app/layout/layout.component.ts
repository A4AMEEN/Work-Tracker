import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { SocketService } from '../core/services/socket.service';
import { ToastService } from '../core/services/toast.service';
import { ToastContainerComponent } from '../core/components/toast-container.component';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {
  user = computed(() => this.auth.currentUser());
  collapsed = signal(localStorage.getItem('sidebarCollapsed') === 'true');
  private subs = new Subscription();
  private shownNotifIds = new Set<string>();

  constructor(
    public auth: AuthService,
    public notificationService: NotificationService,
    private socket: SocketService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationService.refreshUnreadCount();

    // Socket notifications (local dev — instant)
    this.subs.add(
      this.socket.onTaskCreated().subscribe((task) => {
        if (task.person === this.auth.currentUser()?.name) {
          this.toast.taskAssigned(task.description);
        }
      }),
    );

    this.subs.add(
      this.socket.onTaskUpdated().subscribe((task) => {
        const currentUser = this.auth.currentUser()?.name;
        if (!currentUser) return;

        const isPerson = task.person === currentUser;
        const isApprover = task.approverUserId === currentUser;
        if (!isPerson && !isApprover) return;

        if (task.approvalStatus === 'Approved' && isPerson) {
          this.toast.taskApproved(task.description);
        } else if (task.approvalStatus === 'Rework' && isPerson) {
          this.toast.reworkRequested(task.description);
        } else if (task.approvalStatus === 'Pending' && isApprover) {
          this.toast.taskPendingApproval(task.description);
        } else if (task.status === 'Completed' && isPerson) {
          this.toast.taskCompleted(task.description);
        }
      }),
    );

    // Poll fallback (Vercel — no socket.io)
    this.subs.add(
      interval(30_000).subscribe(() => this.pollNotifications()),
    );
  }

  private pollNotifications(): void {
    this.notificationService.getNotifications(true).subscribe({
      next: (res) => {
        for (const n of res.data) {
          if (this.shownNotifIds.has(n._id)) continue;
          this.shownNotifIds.add(n._id);

          switch (n.type) {
            case 'TASK_ASSIGNED':
            case 'BUG_TO_TASK':
              this.toast.taskAssigned(n.message);
              break;
            case 'APPROVAL_APPROVED':
              this.toast.taskApproved(n.message);
              break;
            case 'APPROVAL_PENDING':
              this.toast.taskPendingApproval(n.message);
              break;
            case 'APPROVAL_REWORK':
            case 'REWORK':
              this.toast.reworkRequested(n.message);
              break;
            case 'STATUS_UPDATE':
              this.toast.taskCompleted(n.message);
              break;
            default:
              this.toast.info(n.title, n.message);
          }
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleSidebar(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem('sidebarCollapsed', String(next));
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  logout(): void {
    this.auth.logout();
  }
}