import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppRouter from '@/router/AppRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,       // data is fresh for 1 minute
      retry: 1,                    // retry failed requests once
      refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppRouter />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#1c1c1e',
          color: '#ffffff',
          borderRadius: '12px',
        },
        success: { iconTheme: { primary: '#facc15', secondary: '#000' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  </QueryClientProvider>
);

export default App;