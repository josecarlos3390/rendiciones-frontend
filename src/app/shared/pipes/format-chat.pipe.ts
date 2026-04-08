import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Pipe para formatear mensajes del chatbot
 * Convierte texto plano con marcado simple a HTML seguro
 * 
 * Soporta:
 * - **negrita** → <strong>
 * - *cursiva* → <em>
 * - `código` → <code>
 * - Saltos de línea → <br>
 * - Listas con - o * → <ul><li>
 * - URLs → enlaces clickeables
 */
@Pipe({
  name: 'formatChat',
  standalone: true
})
export class FormatChatPipe implements PipeTransform {
  
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    
    let formatted = value;
    
    // Escapar HTML para evitar XSS
    formatted = this.escapeHtml(formatted);
    
    // Procesar código inline primero (entre backticks)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Procesar negrita (**texto**)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Procesar cursiva (*texto*)
    // Evitar procesar ya procesados (como <strong> que contiene *)
    formatted = formatted.replace(/(?<!<[^>]*)\*([^*]+)\*(?![^<]*>)/g, '<em>$1</em>');
    
    // Procesar listas
    formatted = this.processLists(formatted);
    
    // Convertir URLs en enlaces
    formatted = this.processUrls(formatted);
    
    // Saltos de línea (después de procesar listas)
    formatted = formatted.replace(/\n/g, '<br>');
    
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private processLists(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      
      if (listMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${listMatch[2]}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(line);
      }
    }
    
    if (inList) {
      result.push('</ul>');
    }
    
    return result.join('\n');
  }
  
  private processUrls(text: string): string {
    // Regex simple para URLs http/https
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');
  }
}
