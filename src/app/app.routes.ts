import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { HistoryComponent } from './pages/history/history.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { UsersComponent } from './pages/users/users.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tasks', component: TasksComponent, data: { view: 'all', title: 'All Tasks' } },
      { path: 'today', component: TasksComponent, data: { view: 'today', title: "Today's Work" } },
      { path: 'pending', component: TasksComponent, data: { view: 'pending', title: 'Pending Tasks' } },
      { path: 'done', component: TasksComponent, data: { view: 'done', title: 'Done Tasks' } },
      { path: 'backend-needed', component: TasksComponent, data: { view: 'backend', title: 'Backend Needed' } },
      { path: 'my-tasks', component: TasksComponent, data: { view: 'my', title: 'My Tasks' } },
      { path: 'history', component: HistoryComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'users', component: UsersComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
