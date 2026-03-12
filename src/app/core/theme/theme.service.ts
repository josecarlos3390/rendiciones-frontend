import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'erp-theme';
  private readonly platformId  = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle() {
    const next: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.applyTheme(next);
    if (this.isBrowser) localStorage.setItem(this.STORAGE_KEY, next);
  }

  get isDark(): boolean {
    return this.theme() === 'dark';
  }

  private getInitialTheme(): Theme {
    if (!this.isBrowser) return 'light';
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    // Respetar preferencia del sistema operativo
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme) {
    if (!this.isBrowser) return;
    document.documentElement.setAttribute('data-theme', theme);
  }
}
