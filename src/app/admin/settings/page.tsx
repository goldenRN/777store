
import BackButton from '@/components/BackButton';
import ChangePassword from '@/components/settings/changePassword';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const SettingsPage = () => {
    return (
        <>
            <div className="w-[calc(100vw-300px)]">
                {/* Top bar: always visible */}
                <div className="flex justify-between items-center px-4 py-2 bg-white  sticky top-0 z-10">
                    <BackButton text="Буцах" link="/admin/dashboard" />

                </div>

                {/* Scrollable table area */}
                <div className="overflow-x-auto">
                    <ChangePassword />
                </div>
            </div>

        </>
    );
};

export default SettingsPage;
