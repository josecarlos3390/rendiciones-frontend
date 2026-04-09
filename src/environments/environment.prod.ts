/**
 * Environment configuration for production
 * 
 * SECURITY WARNING: Update apiUrl with your actual production backend URL
 * before deploying. Do not use placeholder URLs in production.
 * 
 * Example: 'https://api.tu-empresa.com/api/v1'
 */

export const environment = {
  production: true,
  // TODO: Replace with your actual production backend URL
  apiUrl: process.env['NG_APP_API_URL'] || 'http://localhost:3000/api/v1',
  // Request timeout in milliseconds  
  requestTimeout: 30000, // 30 seconds
};
