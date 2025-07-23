'use client';

import React, { useState, useRef, useEffect } from 'react';
/* import { useRouter } from 'next/router'; */
import Image from 'next/image';

import { Menu, X } from 'lucide-react'; // ✅ Lucide icons
import { logos } from '../../../../public/assets/images/images';
import { Button } from '@/components/ui/button';

// Adjust your color system if needed
const colors = {
  primary: '#3c096c',
  white: '#ffffff',
};

interface NavbarProps {
  title?: string;
  styless?: string;
  darkMode?: boolean;
}

const Navbar: React.FC<NavbarProps> = () => {
  const [activeButton, setActiveButton] = useState<'login' | 'signup'>('login');
  const [isOpen, setIsOpen] = useState(false);
 /*  const router = useRouter(); */
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Overview' },
    { label: 'Feature' },
    { label: 'About' },
    { label: 'Contact' },
  ];

 /*  const buttonStyle = (type: 'login' | 'signup'): React.CSSProperties => ({
    backgroundColor: activeButton === type ? colors.primary : 'transparent',
    color: activeButton === type ? 'white' : colors.white,
    borderRadius: '100px',
    border: activeButton === type ? 'none' : '1px solid white',
    fontFamily: 'monospace',
    fontWeight: 500,
    padding: '7px 20px',
    cursor: 'pointer',
    transition: '0.2s ease',
  });
 */
  const handleLogin = () => {
    setActiveButton('login');
   /*  router.push('/signin'); */
  };

  const handleSignUp = () => {
    setActiveButton('signup');
   /*  router.push('/signup'); */
  };

  /* useEffect(() => {
    if (isOpen && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [isOpen]);
 */
  return (
    <section className="py-5 sticky top-0 z-50">
      <div className="container px-4 md:px-20 lg:px-2 mx-auto">
        <div className="flex items-center justify-between  rounded-full   px-4 md:px-10">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-[70px] flex gap-x-2">
              <Image
                src={logos.logo2}
                alt="Logo"
                width={38}
                height={38}
                className="object-contain"
                
              />
              <span className='font-bold text-2xl' style={{fontFamily: "poppins"}}>FingAI.</span>
            </div>
            
          </div>

          {/* Desktop Nav */}
          

          {/* Right Section */}
          <div className="flex items-center gap-5">
            {/* Mobile Menu Toggle */}
            <div onClick={() => setIsOpen(!isOpen)} className="md:hidden mr-0 cursor-pointer">
              {isOpen ? (
                <X color="white" size={20} />
              ) : (
                <Menu  className='' size={20} />
              )}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex text-xs items-center gap-4 text-white">
             <Button
  className="relative overflow-hidden rounded-full font-mono px-5 py-2 text-white 
             bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 
             bg-[length:200%_200%] animate-none"
  style={{
    animation: 'shine 2s linear infinite',
    backgroundSize: '200% 200%',
    backgroundPosition: '0% 50%',
  }}
>
  SignIn
</Button>

<style jsx global>{`
  @keyframes shine {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`}</style>

              <Button
              className='bg-transparent hover:text-white  border text-black border-black rounded-4xl font-mono dark:text-white dark:hover:text-black dark:border-white'
              >
                SignUp
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {isOpen && (
          <div className="fixed inset-0 z-50 backdrop-blur-md bg-neutral-900/70 flex flex-col items-center justify-center gap-8">
            {/* Close Icon */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-3 text-white text-2xl hover:text-red-400 transition"
              aria-label="Close Menu"
            >
              <X size={24} />
            </button>

            <div ref={menuRef} className="flex flex-col items-center gap-6">
              {navItems.map((item, i) => (
                <a
                  key={i}
                  href="#"
                  className="text-white capitalize text-4xl"
                  style={{ fontFamily: 'monospace' }}
                >
                  {item.label}
                </a>
              ))}

              <div className="flex flex-col text-lg items-center gap-4 text-white">
                <button  onClick={handleLogin}>
                  SignIn
                </button>
                <button
                  
                  onClick={handleSignUp}
                >
                  SignUp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Navbar;
