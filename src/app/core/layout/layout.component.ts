import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../layout/sidebar/sidebar.component';
import { ToastComponent } from '../toast/toast.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    ToastComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  @ViewChild('sidebar') sidebar!: SidebarComponent;

  sidebarCollapsed = false;
  confirm  = inject(ConfirmDialogService);
  settingsReady = true;

  ngOnInit() {}

  onSidebarToggle(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  toggleSidebar() {
    this.sidebar?.toggleCollapse();
  }
}