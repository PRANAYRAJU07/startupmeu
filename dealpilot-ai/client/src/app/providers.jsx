import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client.js';

function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default Providers;
