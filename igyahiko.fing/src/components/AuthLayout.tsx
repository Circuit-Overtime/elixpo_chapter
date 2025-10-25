import React, { ReactNode } from "react";
import { logos } from "../../public/assets/images/images";
import Image from "next/image";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex md:flex-row w-full h-screen items-center justify-center">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center w-full md:w-1/2 h-full relative px-5 md:px-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1 mb-6">
          <Image alt="FingAI Logo" height={30} width={40} src={logos.logo7} />
          <span className="font-bold text-xl" style={{ fontFamily: "poppins" }}>
            FingAI.
          </span>
        </div>

        {/* Centered Children */}
        <div className="w-full flex justify-center items-center">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
