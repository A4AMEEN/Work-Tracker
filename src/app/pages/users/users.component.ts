import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User, UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  roles: UserRole[] = ['Admin', 'Developer', 'Viewer'];
  showModal = false;
  form = {
    name: '',
    username: '',
    password: '',
    role: 'Developer' as UserRole
  };

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(res => this.users = res.data);
  }

  openAdd(): void {
    this.form = { name: '', username: '', password: '', role: 'Developer' };
    this.showModal = true;
  }

  createUser(): void {
    this.userService.createUser(this.form).subscribe({
      next: () => {
        this.showModal = false;
        this.loadUsers();
      },
      error: err => alert(err?.error?.message || 'User create failed.')
    });
  }

  toggleActive(user: User): void {
    const id = user._id || user.id;
    if (!id) return;

    this.userService.updateUser(id, { isActive: !user.isActive }).subscribe(() => this.loadUsers());
  }

  deleteUser(user: User): void {
    const id = user._id || user.id;
    if (!id || !confirm(`Delete user ${user.name}?`)) return;

    this.userService.deleteUser(id).subscribe({
      next: () => this.loadUsers(),
      error: err => alert(err?.error?.message || 'Delete failed.')
    });
  }
}
