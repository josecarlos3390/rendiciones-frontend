const backendHost =
  typeof window !== 'undefined' && window.location.hostname !== ''
    ? window.location.hostname
      : '10.0.8.45';
//    : '192.168.122.54'; // ← fallback explícito para SSR
//    : '192.168.1.8';

export const environment = {
  production: false,
  apiUrl: `http://${backendHost}:3000/api/v1`,
};