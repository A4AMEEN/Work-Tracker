import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryService } from '../../core/services/history.service';
import { TaskHistory } from '../../core/models/history.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  history: TaskHistory[] = [];
  filters = { person: '', date: '' };
  persons = ['Ansari', 'Ameen', 'Kaviya', 'Rajeena', 'Rohan'];
  loading = false;

  constructor(private historyService: HistoryService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.historyService.getHistory(this.filters).subscribe({
      next: (res) => {
        this.history = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  clear(): void {
    this.filters = { person: '', date: '' };
    this.loadHistory();
  }
}
