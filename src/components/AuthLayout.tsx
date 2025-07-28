import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation'
import { Auth, logos } from '../../public/assets/images/images';
import Image from 'next/image';
import { ArrowBigDownDashIcon } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const navigate = useRouter();

  return (
    <div className='flex flex-col bg-neutral-950 md:flex-row w-full h-screen overflow-hidden'>
     
      {/* Left Auth Content */}
     <div
        className='hidden md:flex w-1/2 h-full relative items-center justify-center overflow-hidden'
       
      >
        {/* Decorative Top Overlay */}
        <div
          
          className='w-[200px] h-[150px] rounded-br-3xl absolute top-0 left-0 z-10'
        />

      
        {/* Main Illustration */}
        <div className='max-w-[100%] max-h-[100%] z-20'>
          <Image
            src={Auth.login2}
            
            className='w-full h-full object-cover'
            alt="login-illustration"
          />
        </div>
      </div>
      
      {/* Right Side Image Section */}
       <div
       
        className='w-full md:w-1/2 h-full px-5 md:px-10 pb-12 overflow-y-auto no-scrollbar'
      >
        
       
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
