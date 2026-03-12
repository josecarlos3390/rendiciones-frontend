const backendHost =
  typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl: `http://${backendHost}:3000/api/v1`,
};