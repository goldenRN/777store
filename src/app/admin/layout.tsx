
import AdminPage from './page';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/app/context/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthProvider>
        <TooltipProvider>
          <ProtectedRoute>
            <div className='flex'>
            <AdminPage>{children}</AdminPage>
            </div>
          </ProtectedRoute>
        </TooltipProvider>
      </AuthProvider>
    </>
  );
};

export default MainLayout;
