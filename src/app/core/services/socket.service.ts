import { Injectable, NgZone } from '@angular/core';
import { io as socketIO, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  connected$ = new BehaviorSubject(false);

  constructor(private zone: NgZone) {
    const baseUrl = environment.apiUrl.replace('/api', '');
    this.socket = socketIO(baseUrl, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => this.zone.run(() => this.connected$.next(true)));
    this.socket.on('disconnect', () => this.zone.run(() => this.connected$.next(false)));
    this.socket.on('connect_error', () => { /* silent — works on Vercel without socket.io */ });
  }

  onTaskUpdated(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('task:updated', (data) => {
        this.zone.run(() => observer.next(data));
      });
    });
  }

  onTaskCreated(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('task:created', (data) => {
        this.zone.run(() => observer.next(data));
      });
    });
  }

  onTaskDeleted(): Observable<string> {
    return new Observable((observer) => {
      this.socket.on('task:deleted', (id) => {
        this.zone.run(() => observer.next(id));
      });
    });
  }
}
