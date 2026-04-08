import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiIndicatorComponent } from '../../../shared/ai-indicator/ai-indicator.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, AiIndicatorComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {

}
