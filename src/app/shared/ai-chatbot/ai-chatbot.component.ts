import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';
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
      title="Asistente de Rendiciones">
      <span class="fab-icon">🤖</span>
      <span class="fab-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
    </button>

    <!-- Panel del chat -->
    <div class="chat-panel" *ngIf="isOpen" [@slideIn]>
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
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .chat-fab:hover { transform: scale(1.1); }
    .chat-fab.open { transform: scale(0); opacity: 0; }

    .chat-fab.pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
      50% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.8); }
    }

    .fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: #f44336;
      border-radius: 50%;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chat-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 360px;
      height: 480px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(0,0,0,0.05);
    }

    @keyframes slideUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      color: #4caf50;
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
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scroll-behavior: smooth;
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
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 18px;
      display: flex;
      gap: 10px;
      position: relative;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      transition: transform 0.2s ease;
    }

    .mensaje-burbuja:hover {
      transform: translateY(-1px);
    }

    .mensaje.usuario .mensaje-burbuja {
      background: #667eea;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .mensaje.asistente .mensaje-burbuja {
      background: #f5f5f5;
      color: #333;
      border-bottom-left-radius: 4px;
    }

    .mensaje-icono { 
      font-size: 16px; 
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 2px;
    }

    .mensaje-contenido {
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: pre-wrap;
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
      background: rgba(0,0,0,0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }

    .mensaje.asistente .mensaje-contenido ::ng-deep code {
      background: rgba(0,0,0,0.08);
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
      color: #667eea;
      text-decoration: underline;
      word-break: break-all;
    }

    .mensaje-contenido ::ng-deep a.chat-link:hover {
      color: #5a6fd6;
    }

    .mensaje.asistente .mensaje-contenido ::ng-deep a.chat-link {
      color: #667eea;
    }

    /* Estilos para mensaje de bienvenida */
    .mensaje-bienvenida {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%) !important;
      border: 1px solid rgba(102, 126, 234, 0.15);
    }

    .bienvenida-titulo {
      font-weight: 600;
      font-size: 15px;
      color: #4a5568;
      margin-bottom: 6px;
    }

    .bienvenida-subtitulo {
      font-size: 12px;
      color: #718096;
      margin-bottom: 8px;
    }

    .bienvenida-opciones {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .opcion-tag {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .bienvenida-pregunta {
      font-weight: 600;
      color: #667eea;
      font-size: 13px;
    }

    .mensaje.usuario .mensaje-contenido ::ng-deep a.chat-link {
      color: #a8c0ff;
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
      background: #a0aec0;
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
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
    }

    .sugerencia-chip {
      padding: 5px 10px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #667eea;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .sugerencia-chip:hover {
      background: #667eea;
      color: white;
      border-color: #667eea;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
    }

    .sugerencia-chip:active {
      transform: translateY(0);
    }

    .chat-input {
      padding: 10px 16px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      gap: 8px;
      background: white;
    }

    .chat-input input {
      flex: 1;
      padding: 8px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      outline: none;
      font-size: 14px;
      transition: all 0.2s ease;
      background: #f8fafc;
    }

    .chat-input input:focus {
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .chat-input input::placeholder {
      color: #a0aec0;
    }

    .btn-enviar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #667eea;
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
      background: #5a6fd6; 
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
      color: #718096;
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border-top: 1px solid #e2e8f0;
    }

    .chat-disabled p {
      margin: 0 0 4px 0;
      font-size: 14px;
    }

    .chat-disabled small {
      font-size: 12px;
      color: #a0aec0;
    }

    @media (max-width: 480px) {
      .chat-panel {
        width: calc(100% - 32px);
        height: calc(100vh - 100px);
        bottom: 16px;
        right: 16px;
      }
    }
  `]
})
export class AiChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
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
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Suscribirse al estado de IA
    this.aiService.aiStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.iaEnabled = !!(status?.ia?.enabled && status?.ia?.configured);
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
    if (this.shouldScroll && this.messagesContainer) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
    // Forzar detección de cambios si el chat está abierto y no hay mensajes
    if (this.isOpen && this.mensajes.length === 0) {
      this.cdr.detectChanges();
    }
  }

  private scrollToBottom() {
    try {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  toggleChat() {
    this.ngZone.run(() => {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.unreadCount = 0;
        // Asegurar que el mensaje de bienvenida se muestre
        if (this.mensajes.length === 0) {
          // Forzar detección de cambios después de un pequeño delay
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        }
      }
    });
  }

  enviarMensaje() {
    const mensaje = this.nuevoMensaje.trim();
    if (!mensaje || this.isLoading) return;

    // Agregar mensaje del usuario
    this.mensajes.push({
      rol: 'usuario',
      contenido: mensaje,
      timestamp: new Date()
    });

    this.nuevoMensaje = '';
    this.isLoading = true;
    this.sugerencias = [];
    this.shouldScroll = true;

    // Enviar a la IA
    const historial = this.mensajes.slice(-10).map(m => ({
      rol: m.rol,
      contenido: m.contenido
    }));

    this.aiService.chat({
      mensaje,
      historial,
      usuarioId: '123'
    }).subscribe({
      next: (respuesta) => {
        this.ngZone.run(() => {
          if (respuesta) {
            this.mensajes.push({
              rol: 'asistente',
              contenido: respuesta.mensaje,
              timestamp: new Date()
            });
            this.sugerencias = respuesta.sugerencias || [];
          }
          this.isLoading = false;
          this.shouldScroll = true;
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.mensajes.push({
            rol: 'asistente',
            contenido: 'Lo siento, hubo un error. Inténtalo de nuevo.',
            timestamp: new Date()
          });
          this.isLoading = false;
        });
      }
    });
  }

  usarSugerencia(sugerencia: string) {
    this.nuevoMensaje = sugerencia;
    this.enviarMensaje();
  }
}
