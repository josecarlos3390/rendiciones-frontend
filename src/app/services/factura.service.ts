import { Injectable, inject } from '@angular/core';
import { HttpClient }          from '@angular/common/http';
import { environment }         from '../../environments/environment';

export interface FacturaSiat {
  cuf:           string;
  nit:           string;
  invoiceNumber: string;
  companyName:   string;
  clientName:    string;
  clientDoc:     string;
  status:        string;
  datetime:      string | null;
  total:         number;
}

@Injectable({ providedIn: 'root' })
export class FacturaService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/factura`;

  getFromSiat(url: string) {
    return this.http.get<FacturaSiat>(`${this.api}/siat`, {
      params: { url },
    });
  }
}