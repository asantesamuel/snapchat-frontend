import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppRouter from '@/router/AppRouter';
import { useSessionGuard } from '@/hooks/useSessionGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// AppWithGuard must be a separate inner component — not inline inside App
// because useSessionGuard calls useQuery internally (via usersApi.getMe)
// and React hooks can only be called inside components that are
// children of their required providers — in this case QueryClientProvider
// calling useSessionGuard directly inside App would throw:
// "No QueryClient set, use QueryClientProvider to set one"
const AppWithGuard = () => {
  useSessionGuard();

  return (
    <>
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
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppWithGuard />
  </QueryClientProvider>
);

export default App;