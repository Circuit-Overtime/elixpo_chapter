'use client';

import Image from 'next/image';
import React from 'react';
import { logos } from '../../../../public/assets/images/images';
import Link from 'next/link';
import { FaDiscord, FaGithubAlt, FaInstagram, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <section className='py-20 bg-white dark:bg-black mt-10 relative shadow rounded-t-4xl'>
      <div className='container mx-auto px-4 md:px-8'>
        <div className='px-6 py-10 border border-black/15 dark:border-white/15 shadow-2xs rounded-3xl'>
          <div className='flex flex-col lg:flex-row lg:justify-between gap-10'>
            {/* Left section */}
            <div className='flex flex-col items-start'>
              <div className='flex items-center gap-2'>
                <Image
                  width={50}
                  height={50}
                  className='object-contain'
                  alt='logo'
                  src={logos.logo7}
                />
                <h1 className='text-3xl font-bold text-black dark:text-white' style={{ fontFamily: 'poppins' }}>
                  FingAI.
                </h1>
              </div>
              <p className='text-xs mt-5 font-mono text-black/70 dark:text-white/60'>
                From intuitive design to powerful features, our app has <br />
                become an essential tool for users across India!
              </p>

              <div className='mt-4 flex  items-center gap-5'>
                <FaInstagram size={24} className='text-black dark:text-white hover:scale-110 transition' />
                <FaGithubAlt size={24} className='text-black dark:text-white hover:scale-110 transition' />
                <FaLinkedin size={24} className='text-black dark:text-white hover:scale-110 transition' />
                <FaDiscord size={24} className='text-black dark:text-white hover:scale-110 transition' />
              </div>
            </div>

            {/* Right section */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 text-center'>
              {/* Product */}
              <div>
                <h1 className='font-bold text-4xl md:text-lg font-mono text-black dark:text-white'>Product</h1>
                <div className='mt-2 flex flex-col gap-y-3 text-2xl md:text-xs font-mono text-black/70 dark:text-white/60'>
                  <Link href="#">Features</Link>
                  <Link href="#">Pricing</Link>
                  <Link href="#">Integration</Link>
                  <Link href="#">Changelog</Link>
                </div>
              </div>

              {/* Resources */}
              <div>
                <h1 className='font-bold text-4xl md:text-lg font-mono text-black dark:text-white'>Resources</h1>
                <div className='mt-2 flex flex-col gap-y-3 text-xl md:text-xs font-mono text-black/70 dark:text-white/60'>
                  <Link href="#">Documentation</Link>
                  <Link href="#">Tutorials</Link>
                  <Link href="#">Blog</Link>
                  <Link href="#">Support</Link>
                </div>
              </div>

              {/* Company */}
              <div>
                <h1 className='font-bold font-mono text-4xl md:text-lg   text-black dark:text-white'>Company</h1>
                <div className='mt-2 flex flex-col  gap-y-3 text-2xl md:text-xs font-mono text-black/70 dark:text-white/60'>
                  <Link href="#">About</Link>
                  <Link href="#">Careers</Link>
                  <Link href="#">Contact</Link>
                  <Link href="#">Partner</Link>
                </div>
              </div>
            </div>
          </div>

          <div className='border-t border-black/15 dark:border-white/15 mt-10' />

          {/* Bottom Row */}
          <div className='mt-10 flex flex-col md:flex-row items-center justify-between gap-3'>
            <p className='text-xs font-mono text-black/60 dark:text-white/40'>
              © 2025 FingAI. All rights reserved.
            </p>

            <div className='flex gap-x-4 text-xs underline font-mono text-black dark:text-white'>
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Terms & Conditions</Link>
              <Link href="#">Cookie Settings</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Footer;
