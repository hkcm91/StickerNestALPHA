import React, { Suspense } from 'react';

import { AppErrorBoundary } from './shell/error/error-boundary';
import { AppRouter } from './shell/router/router';
import { ThemeProvider } from './shell/theme/theme-provider';

export const App: React.FC = () => (
  <AppErrorBoundary>
    <ThemeProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <AppRouter />
      </Suspense>
    </ThemeProvider>
  </AppErrorBoundary>
);
