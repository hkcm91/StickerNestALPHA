import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { initKernel } from './kernel/init';
import { initRuntime } from './runtime/init';
import { initShell } from './shell/init';

// Initialize layers in order
initKernel();
initRuntime();
initShell();

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
