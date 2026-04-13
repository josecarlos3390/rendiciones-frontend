import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';

/**
 * Dumb Component: Estado de carga
 */
@Component({
  selector: 'app-integracion-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SkeletonLoaderComponent],
  template: `
    <app-skeleton-loader variant="table" [rows]="rows" [columns]="columns">
    </app-skeleton-loader>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class IntegracionLoadingComponent {
  @Input() rows = 4;
  @Input() columns: string[] = ['10%', '20%', '20%', '15%', '10%', '10%', '15%'];
}
