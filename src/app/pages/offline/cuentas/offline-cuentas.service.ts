import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface CuentaCOA {
  COA_CODE:        string;
  COA_NAME:        string;
  COA_FORMAT_CODE: string;
  COA_ASOCIADA:    'Y' | 'N';
  COA_ACTIVA:      'Y' | 'N';
}

export interface CreateCuentaPayload {
  COA_CODE:         string;
  COA_NAME:         string;
  COA_FORMAT_CODE?: string;
  COA_ASOCIADA?:    'Y' | 'N';
  COA_ACTIVA?:      'Y' | 'N';
}

export interface UpdateCuentaPayload {
  COA_NAME?:        string;
  COA_FORMAT_CODE?: string;
  COA_ASOCIADA?:    'Y' | 'N';
  COA_ACTIVA?:      'Y' | 'N';
}

@Injectable({ providedIn: 'root' })
export class OfflineCuentasService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/offline/cuentas`;

  getAll()                                     { return this.http.get<CuentaCOA[]>(this.api); }
  create(data: CreateCuentaPayload)            { return this.http.post<CuentaCOA>(this.api, data); }
  update(code: string, data: UpdateCuentaPayload) { return this.http.patch<{ affected: number }>(`${this.api}/${code}`, data); }
  remove(code: string)                         { return this.http.delete<{ affected: number }>(`${this.api}/${code}`); }
}