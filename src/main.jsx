import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';

// Note: StrictMode is disabled because it runs effects twice in development,
// which causes issues with OpenCV.js WASM initialization
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
