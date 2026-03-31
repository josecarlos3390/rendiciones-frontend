const backendHost =
  typeof window !== 'undefined' && window.location.hostname !== ''
    ? window.location.hostname
//    : '192.168.122.56';

//    ? window.location.hostname
//      : '10.0.8.45';
      : '192.168.122.51'; // ← fallback explícito para SSR
//    : '192.168.1.6';


export const environment = {
  production: false,
  // Proxy Angular redirige /api/v1 → http://localhost:3000/api/v1
  // Evita Mixed Content (HTTPS frontend → HTTP backend)
  apiUrl: `/api/v1`,
};
