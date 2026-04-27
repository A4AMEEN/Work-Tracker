import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { CacheService } from '../../core/services/cache.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  data: any = null;
  loading = false;

  constructor(
    private dashboardService: DashboardService,
    private cache: CacheService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    const key = 'dashboard:main';
    const cached = this.cache.get<any>(key);

    if (cached) {
      // show instantly from cache
      this.data = cached;
      // refresh silently in background
      this.dashboardService.getDashboard().subscribe({
        next: (res) => {
          this.cache.set(key, res.data, 60_000);
          this.data = res.data;
        },
        error: () => {}
      });
      return;
    }

    // first load — show spinner
    this.loading = true;
    this.dashboardService.getDashboard().subscribe({
      next: (res) => {
        this.cache.set(key, res.data, 60_000);
        this.data = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  maxCount(items: any[], key = 'count'): number {
    return Math.max(...(items || []).map(x => x[key]), 1);
  }
}