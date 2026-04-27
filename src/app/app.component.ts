import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  // warmup call on app start so backend is awake before user clicks anything
constructor(private http: HttpClient) {
  this.http.get(`${environment.apiUrl.replace('/api', '')}/`).subscribe();
}
}
