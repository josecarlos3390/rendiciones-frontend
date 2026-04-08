import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiIndicatorComponent } from '../../../shared/ai-indicator/ai-indicator.component';
import { AppModeService } from '../../../services/app-mode.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, AiIndicatorComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  private appModeSvc = inject(AppModeService);
  isOffline = false;

  ngOnInit(): void {
    this.appModeSvc.mode$.subscribe(mode => {
      this.isOffline = mode?.isOffline ?? false;
    });
  }
}
