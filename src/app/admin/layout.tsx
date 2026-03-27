
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/app/context/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminShell from './shell';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthProvider>
        <TooltipProvider>
          <ProtectedRoute requireAdmin>
            <div className='flex'>
            <AdminShell>{children}</AdminShell>
            </div>
          </ProtectedRoute>
        </TooltipProvider>
      </AuthProvider>
    </>
  );
};

export default MainLayout;
