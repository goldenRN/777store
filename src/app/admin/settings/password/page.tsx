"use client";

import BackButton from "@/components/BackButton";
import ChangePassword from "@/components/settings/changePassword";

const PasswordPage = () => {
  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex justify-between items-center px-1 py-2 bg-white sticky top-0 z-10">
        <BackButton text="Буцах" link="/admin/dashboard" />
      </div>
      <div className="mt-4">
        <ChangePassword />
      </div>
    </div>
  );
};

export default PasswordPage;
