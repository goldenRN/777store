
import AdminPage from './page';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/app/context/AuthContext';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthProvider>
        <ProtectedRoute>
          <div className='flex'>
            <AdminPage>{children}</AdminPage>
            {/* <div className='p-5 w-full md:max-w-[1140px]'>{children}</div> */}
          </div>
        </ProtectedRoute>
      </AuthProvider>
    </>
  );
};

export default MainLayout;
