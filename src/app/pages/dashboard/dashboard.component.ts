import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  data: any;
  loading = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboard().subscribe({
      next: (res) => {
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