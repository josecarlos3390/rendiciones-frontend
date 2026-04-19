/**
 * Environment configuration for development
 * 
 * SECURITY NOTE: Never commit real IPs or credentials to version control.
 * Use environment variables or local config files for sensitive data.
 */

export const environment = {
  production: false,
  //production: true,
  // Proxy Angular redirige /api/v1 → http://localhost:3000/api/v1
  // Evita Mixed Content (HTTPS frontend → HTTP backend)
  apiUrl: `/api/v1`,
  //apiUrl: '/ESCR/api/v1',
  // Request timeout in milliseconds
  requestTimeout: 30000, // 30 seconds
};
