const backendHost =
  typeof window !== 'undefined' && window.location.hostname !== ''
    ? window.location.hostname
    : '192.168.122.54'; // ← fallback explícito para SSR

export const environment = {
  production: false,
  apiUrl: `http://${backendHost}:3000/api/v1`,
};