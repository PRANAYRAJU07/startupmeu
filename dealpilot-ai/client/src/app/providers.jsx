import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client.js';
import { AuthProvider } from '../features/auth/AuthContext.jsx';

function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default Providers;
