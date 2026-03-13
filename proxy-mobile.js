const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/', createProxyMiddleware({
  target: 'http://localhost:4200',
  changeOrigin: true,
  ws: true,
}));

app.listen(4201, '0.0.0.0', () => {
  console.log('Proxy mobile corriendo en http://0.0.0.0:4201');
  console.log('Accedé desde el celular a http://192.168.122.54:4201');
});