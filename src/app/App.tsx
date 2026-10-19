import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { SessionCacheGuard } from '@/auth/guards';
import { createQueryClient } from './queryClient';
import { router } from './router';

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionCacheGuard />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
