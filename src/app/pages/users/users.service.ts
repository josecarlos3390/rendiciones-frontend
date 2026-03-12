import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

export interface UserPayload {
  name?:            string;
  supervisorName?:  string;
  superUser?:       number;
  estado?:          string;
  appRend?:         string;
  appConf?:         string;
  appExtB?:         string;
  appUpLA?:         string;
  genDocPre?:       string;
  fijarNr?:         string;
  nr1?:             string;
  nr2?:             string;
  nr3?:             string;
  nr4?:             string;
  nr5?:             string;
  fijarSaldo?:      string;
  fechaExpiracion?: string;
  password?:        string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/users`;

  getAll() {
    return this.http.get<User[]>(this.api);
  }

  create(data: UserPayload & { login: string; password: string }) {
    return this.http.post<User>(this.api, data);
  }

  updateByAdmin(id: number, data: UserPayload) {
    return this.http.patch<User>(`${this.api}/${id}`, data);
  }

  toggleStatus(id: number, estado: 'A' | 'I') {
    return this.http.patch<User>(`${this.api}/${id}`, { estado });
  }

  getMe() {
    return this.http.get<User>(`${this.api}/me`);
  }

  updateMyName(name: string) {
    return this.http.patch<User>(`${this.api}/me`, { name });
  }

  updateMyPassword(data: { currentPassword: string; newPassword: string }) {
    return this.http.patch<{ message: string }>(`${this.api}/me/password`, data);
  }
}