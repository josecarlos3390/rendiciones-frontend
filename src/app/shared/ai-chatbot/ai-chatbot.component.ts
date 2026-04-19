import { Component, OnInit, OnDestroy, OnChanges, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '@services/ai.service';
import { Subject, takeUntil } from 'rxjs';
import { FormatChatPipe } from '../pipes/format-chat.pipe';

interface ChatMensaje {
  rol: 'usuario' | 'asistente';
  contenido: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatChatPipe],
  template: `
    <!-- Botón flotante -->
    <button 
      class="chat-fab" 
      (click)="toggleChat()"
      [class.open]="isOpen"
      [class.pulse]="!isOpen && unreadCount > 0"
      [style.left]="fabLeft"
      title="Asistente de Rendiciones">
      <span class="fab-icon">🤖</span>
      <span class="fab-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
    </button>

    <!-- Panel del chat -->
    <div class="chat-panel" *ngIf="isOpen" [style.left]="fabLeft">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-info">
          <span class="header-icon">🤖</span>
          <div class="header-text">
            <span class="header-title">Asistente IA</span>
            <span class="header-status" [class.online]="iaEnabled">
              {{ iaEnabled ? 'En línea' : 'IA no habilitada' }}
            </span>
          </div>
        </div>
        <button class="btn-close" (click)="toggleChat()">✕</button>
      </div>

      <!-- Mensajes -->
      <div class="chat-messages" #messagesContainer>
        <div class="mensaje" 
             *ngFor="let msg of mensajes" 
             [class.usuario]="msg.rol === 'usuario'"
             [class.asistente]="msg.rol === 'asistente'">
          <div class="mensaje-burbuja">
            <span class="mensaje-icono">{{ msg.rol === 'usuario' ? '👤' : '🤖' }}</span>
            <div class="mensaje-contenido" [innerHTML]="msg.contenido | formatChat"></div>
            <span class="mensaje-hora">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>
        </div>

        <!-- Indicador de escribiendo -->
        <div class="mensaje asistente escribiendo" *ngIf="isLoading">
          <div class="mensaje-burbuja">
            <span class="mensaje-icono">🤖</span>
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Mensaje inicial (siempre visible cuando no hay mensajes) -->
        <div class="mensaje asistente mensaje-bienvenida-container" *ngIf="!mensajes.length">
          <div class="mensaje-burbuja mensaje-bienvenida">
            <span class="mensaje-icono">🤖</span>
            <div class="mensaje-contenido">
              <div class="bienvenida-titulo">¡Hola! 👋 Soy tu asistente</div>
              <div class="bienvenida-subtitulo">Puedo ayudarte con:</div>
              <div class="bienvenida-opciones">
                <span class="opcion-tag">💰 Gastos</span>
                <span class="opcion-tag">📋 Rendiciones</span>
                <span class="opcion-tag">🏷️ Clasificación</span>
                <span class="opcion-tag">📖 Normas</span>
              </div>
              <div class="bienvenida-pregunta">¿Qué necesitas?</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sugerencias -->
      <div class="chat-sugerencias" *ngIf="sugerencias.length > 0 && !isLoading">
        <button 
          class="sugerencia-chip" 
          *ngFor="let sug of sugerencias"
          (click)="usarSugerencia(sug)">
          {{ sug }}
        </button>
      </div>

      <!-- Input -->
      <div class="chat-input" *ngIf="iaEnabled">
        <input 
          type="text" 
          [(ngModel)]="nuevoMensaje"
          (keyup.enter)="enviarMensaje()"
          placeholder="Escribe tu pregunta..."
          [disabled]="isLoading"
        />
        <button 
          class="btn-enviar" 
          (click)="enviarMensaje()"
          [disabled]="!nuevoMensaje.trim() || isLoading">
          <span>➤</span>
        </button>
      </div>

      <!-- Mensaje IA deshabilitada -->
      <div class="chat-disabled" *ngIf="!iaEnabled">
        <p>🚫 Las funcionalidades de IA no están habilitadas.</p>
        <small>Contacta al administrador para activar el asistente.</small>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .chat-fab {
      position: fixed;
      bottom: 24px;
      /* left es controlado dinámicamente por [style.left]="fabLeft" */
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary, #764ba2) 100%);
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Sincroniza con la transición del sidebar (0.22s) + transform/opacity propios */
      transition: left 0.22s cubic-bezier(.4,0,.2,1), transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease;
    }

    .chat-fab:hover { transform: scale(1.1); }
    .chat-fab.open { transform: scale(0); opacity: 0; }

    .chat-fab.pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
      50% { box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5); }
    }

    .fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: var(--color-danger);
      border-radius: 50%;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .chat-panel {
      position: fixed;
      top: 60px;       /* justo debajo del header */
      bottom: 24px;
      /* left es controlado dinámicamente por [style.left]="fabLeft" */
      width: 380px;
      max-width: calc(100vw - 48px); /* nunca más ancho que la pantalla menos márgenes */
      height: auto;    /* usa top+bottom en vez de altura fija */
      background: var(--bg-surface);
      border-radius: var(--radius-xl, 20px);
      box-shadow: var(--shadow-modal);
      z-index: 99;     /* por debajo del header (z-index 100) */
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      /* Sincroniza con la transición del sidebar */
      transition: left 0.22s cubic-bezier(.4,0,.2,1);
      border: 1px solid var(--border-color);
    }

    @keyframes slideUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .chat-header {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary, #764ba2) 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon { font-size: 28px; }

    .header-text {
      display: flex;
      flex-direction: column;
    }

    .header-title { font-weight: 600; font-size: 16px; }

    .header-status {
      font-size: 12px;
      opacity: 0.8;
    }

    .header-status.online {
      color: var(--color-success, #4caf50);
    }

    .btn-close {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    }

    .btn-close:hover {
      background: rgba(255,255,255,0.3);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scroll-behavior: smooth;
      background: var(--bg-faint);
    }

    .mensaje {
      display: flex;
      animation: fadeInUp 0.3s ease;
    }

    .mensaje-bienvenida-container {
      display: flex !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .mensaje.usuario {
      justify-content: flex-end;
    }

    .mensaje.asistente {
      justify-content: flex-start;
    }

    .mensaje-burbuja {
      max-width: 90%;
      min-width: 0;
      padding: 10px 14px;
      border-radius: 18px;
      display: flex;
      gap: 10px;
      position: relative;
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.08));
      transition: transform 0.2s ease;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }

    .mensaje-burbuja:hover {
      transform: translateY(-1px);
    }

    .mensaje.usuario .mensaje-burbuja {
      background: var(--color-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .mensaje.asistente .mensaje-burbuja {
      background: var(--bg-subtle);
      color: var(--text-body);
      border-bottom-left-radius: 4px;
      width: 100%;
      max-width: 100%;
    }

    .mensaje-icono { 
      font-size: 16px; 
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 2px;
    }

    .mensaje-contenido {
      font-size: 13px;
      line-height: 1.4;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }

    /* Estilos para formato markdown */
    .mensaje-contenido ::ng-deep strong {
      font-weight: 600;
      color: inherit;
    }

    .mensaje-contenido ::ng-deep em {
      font-style: italic;
    }

    .mensaje-contenido ::ng-deep code {
      background: var(--bg-subtle);
      color: var(--text-body);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: 12px;
      word-break: break-all;
    }

    .mensaje.usuario .mensaje-contenido ::ng-deep code {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .mensaje.asistente .mensaje-contenido ::ng-deep code {
      background: var(--bg-faint);
    }

    /* Tablas y contenido largo - scroll horizontal */
    .mensaje-contenido ::ng-deep table {
      display: block;
      overflow-x: auto;
      max-width: 100%;
      font-size: 12px;
      border-collapse: collapse;
    }

    .mensaje-contenido ::ng-deep table th,
    .mensaje-contenido ::ng-deep table td {
      padding: 4px 8px;
      border: 1px solid var(--border-color);
      white-space: nowrap;
    }

    /* Líneas largas - scroll horizontal */
    .mensaje-contenido ::ng-deep pre {
      overflow-x: auto;
      max-width: 100%;
      padding: 8px;
      background: var(--bg-subtle);
      border-radius: 6px;
      font-size: 12px;
    }

    .mensaje-contenido ::ng-deep ul {
      margin: 6px 0;
      padding-left: 18px;
    }

    .mensaje-contenido ::ng-deep li {
      margin-bottom: 2px;
      list-style-type: disc;
    }

    .mensaje-contenido ::ng-deep li:last-child {
      margin-bottom: 0;
    }

    .mensaje-contenido ::ng-deep a.chat-link {
      color: var(--color-primary);
      text-decoration: underline;
      word-break: break-all;
    }

    .mensaje-contenido ::ng-deep a.chat-link:hover {
      color: var(--color-primary-text);
    }

    .mensaje.asistente .mensaje-contenido ::ng-deep a.chat-link {
      color: var(--color-primary);
    }

    /* Estilos para mensaje de bienvenida */
    .mensaje-bienvenida {
      background: var(--color-primary-bg) !important;
      border: 1px solid var(--color-primary-border);
    }

    .bienvenida-titulo {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-heading);
      margin-bottom: 6px;
    }

    .bienvenida-subtitulo {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .bienvenida-opciones {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .opcion-tag {
      background: var(--color-primary-bg);
      color: var(--color-primary);
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--color-primary-border);
    }

    .bienvenida-pregunta {
      font-weight: 600;
      color: var(--color-primary);
      font-size: 13px;
    }

    .mensaje.usuario .mensaje-contenido ::ng-deep a.chat-link {
      color: rgba(255,255,255,0.9);
    }

    .mensaje-contenido ::ng-deep br {
      display: block;
      content: "";
      margin-bottom: 2px;
    }

    .mensaje-hora {
      font-size: 10px;
      opacity: 0.5;
      position: absolute;
      bottom: -16px;
      right: 8px;
      white-space: nowrap;
    }

    .typing-indicator {
      display: flex;
      gap: 3px;
      align-items: center;
      padding: 6px 4px;
    }

    .typing-indicator span {
      width: 6px;
      height: 6px;
      background: var(--text-muted);
      border-radius: 50%;
      animation: typing 1.4s ease-in-out infinite;
    }

    .typing-indicator span:nth-child(1) { animation-delay: 0ms; }
    .typing-indicator span:nth-child(2) { animation-delay: 200ms; }
    .typing-indicator span:nth-child(3) { animation-delay: 400ms; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .chat-sugerencias {
      padding: 10px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-faint);
    }

    .sugerencia-chip {
      padding: 5px 10px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-primary);
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
    }

    .sugerencia-chip:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md, 0 2px 4px rgba(0,0,0,0.15));
    }

    .sugerencia-chip:active {
      transform: translateY(0);
    }

    .chat-input {
      padding: 10px 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 8px;
      background: var(--bg-surface);
    }

    .chat-input input {
      flex: 1;
      padding: 8px 14px;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      outline: none;
      font-size: 14px;
      transition: all 0.2s ease;
      background: var(--bg-faint);
      color: var(--text-body);
    }

    .chat-input input:focus {
      border-color: var(--color-primary);
      background: var(--bg-surface);
      box-shadow: 0 0 0 3px var(--color-primary-bg);
    }

    .chat-input input::placeholder {
      color: var(--text-faint);
    }

    .btn-enviar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
      font-size: 14px;
    }

    .btn-enviar:hover:not(:disabled) { 
      background: var(--color-primary-text); 
      transform: scale(1.05);
    }
    .btn-enviar:active:not(:disabled) {
      transform: scale(0.95);
    }
    .btn-enviar:disabled { 
      opacity: 0.4; 
      cursor: not-allowed;
      transform: none;
    }

    .chat-disabled {
      padding: 20px 16px;
      text-align: center;
      color: var(--text-muted);
      background: var(--bg-faint);
      border-top: 1px solid var(--border-color);
    }

    .chat-disabled p {
      margin: 0 0 4px 0;
      font-size: 14px;
    }

    .chat-disabled small {
      font-size: 12px;
      color: var(--text-faint);
    }

    @media (max-width: 768px) {
      /* En móvil, fabLeft devuelve '16px' — no hace falta override aquí */
      .chat-panel {
        top: 56px;     /* header mobile = 56px */
        bottom: 0;
        left: 0 !important; /* en móvil ocupa todo el ancho */
        right: 0;
        width: 100%;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-bottom: none;
      }
    }
  `]
})
export class AiChatbotComponent implements OnInit, OnDestroy, AfterViewChecked, OnChanges {
  /** Recibe el estado del sidebar desde el layout padre */
  @Input() sidebarCollapsed = false;

  isOpen = false;
  iaEnabled = false;
  mensajes: ChatMensaje[] = [];
  nuevoMensaje = '';
  isLoading = false;
  sugerencias: string[] = [];
  unreadCount = 0;
  private shouldScroll = false;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private destroy$ = new Subject<void>();

  constructor(
    private aiService: AiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // Marcar para verificación cuando el sidebar cambia para actualizar la posición
    if (changes['sidebarCollapsed']) {
      this.cdr.markForCheck();
    }
  }

  /**
   * Calcula el `left` del botón y el panel según el estado del sidebar.
   * Usa la variable CSS --sidebar-width si está disponible, si no usa valores por defecto.
   * - Desktop expandido : sidebar = 240px → left = 240 + 24 = 264px
   * - Desktop colapsado : sidebar =  72px → left =  72 + 24 =  96px
   * - Móvil             : sidebar =   0px → left = 24px
   */
  get fabLeft(): string {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return '24px';
    }
    // Añade margen adicional para no tocar el borde del sidebar
    const margin = 24;
    return this.sidebarCollapsed ? `calc(72px + ${margin}px)` : `calc(240px + ${margin}px)`;
  }

  ngOnInit() {
    // Suscribirse al estado de IA
    this.aiService.aiStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.iaEnabled = !!(status?.ia?.enabled && status?.ia?.configured);
        this.cdr.markForCheck();
      });
    
    // Cargar estado inicial si no está cargado
    if (!this.aiService.status) {
      this.aiService.cargarStatus().subscribe();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked() {
    // Scroll al final cuando es necesario
    if (this.shouldScroll && this.messagesContainer) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      this.cargarSugerencias();
      this.shouldScroll = true;
    }
    this.cdr.markForCheck();
  }

  cargarSugerencias() {
    // Sugerencias contextuales basadas en la página actual
    const path = window.location.pathname;
    
    if (path.includes('/rend-m')) {
      this.sugerencias = [
        '¿Cómo creo una nueva rendición?',
        '¿Qué significa cada estado?',
        '¿Cómo cambio de perfil?'
      ];
    } else if (path.includes('/rend-d')) {
      this.sugerencias = [
        '¿Cómo agrego un documento?',
        '¿Qué es el cálculo de impuestos?',
        '¿Cómo funciona el porcentaje de norma?'
      ];
    } else if (path.includes('/aprobaciones')) {
      this.sugerencias = [
        '¿Cómo apruebo una rendición?',
        '¿Qué puedo modificar antes de aprobar?',
        '¿Qué pasa si rechazo?'
      ];
    } else {
      this.sugerencias = [
        '¿Qué puedes hacer?',
        'Ayuda con rendiciones',
        'Explica los impuestos'
      ];
    }
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim() || this.isLoading || !this.iaEnabled) return;

    const mensaje = this.nuevoMensaje.trim();
    this.nuevoMensaje = '';

    // Agregar mensaje del usuario
    this.mensajes.push({
      rol: 'usuario',
      contenido: mensaje,
      timestamp: new Date()
    });

    this.shouldScroll = true;
    this.isLoading = true;

    // Enviar al servicio de IA
    this.aiService.chat({
      mensaje,
      historial: this.mensajes.map(m => ({ rol: m.rol, contenido: m.contenido })),
      paginaActual: window.location.pathname
    }).subscribe({
      next: (respuesta) => {
        const contenido = respuesta?.mensaje ?? 'Sin respuesta del asistente.';
        if (respuesta?.sugerencias?.length) {
          this.sugerencias = respuesta.sugerencias;
        }
        this.mensajes.push({
          rol: 'asistente',
          contenido,
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.mensajes.push({
          rol: 'asistente',
          contenido: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      }
    });
  }

  usarSugerencia(sugerencia: string) {
    this.nuevoMensaje = sugerencia;
    this.enviarMensaje();
  }

  private scrollToBottom() {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error scrolling:', err);
    }
  }
}