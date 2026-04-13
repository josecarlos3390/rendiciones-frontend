/**
 * Pipes reutilizables del sistema
 * 
 * Todos son standalone y pueden importarse directamente:
 * 
 * import { CurrencyPipe, DateFormatPipe } from '@shared/pipes';
 * 
 * O individualmente:
 * 
 * import { CurrencyPipe } from '@shared/pipes/currency.pipe';
 */

// Currency / Números
export { CurrencyPipe, NumberFormatPipe, PercentPipe } from './currency.pipe';

// Fechas
export { DateFormatPipe, RelativeTimePipe } from './date.pipe';

// Strings
export { TruncatePipe, CapitalizePipe, NitPipe, EstadoBadgePipe } from './string.pipe';

// Legacy
export { FormatChatPipe } from './format-chat.pipe';
