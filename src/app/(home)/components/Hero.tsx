'use client'

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import HeroForm from './HeroForm';
/* import { motion, useAnimate } from 'framer-motion';
import CustomButton from '@/components/CustomButton';
import Pointer from '@/components/Pointer';
import { BsRocket } from 'react-icons/bs';
import { images } from '@/constants/images';
import { colors } from '@/constants/color'; */

interface HeroProps {
  darkMode?: boolean;
}

const Hero: React.FC<HeroProps> = ({ darkMode }) => {
  const slogans = [
    'Hack it. Prompt it. Launch it.',
    'Code less. Launch smarter.',
    'Generate. Push. Deploy.',
    'Prompt. Publish. Profit.'
  ];

  const [text, setText] = useState('');
  const [sloganIndex, setSloganIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const router = useRouter();

  /* const [leftDiv, leftDivAni] = useAnimate();
  const [leftPoint, leftPointAni] = useAnimate();
  const [rightDiv, rightDivAni] = useAnimate();
  const [rightPoint, rightPointAni] = useAnimate();
 */
  useEffect(() => {
    const current = slogans[sloganIndex];
    if (charIndex < current.length) {
      const timeout = setTimeout(() => {
        setText((prev) => prev + current[charIndex]);
        setCharIndex(charIndex + 1);
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      const delay = setTimeout(() => {
        setText('');
        setCharIndex(0);
        setSloganIndex((prev) => (prev + 1) % slogans.length);
      }, 1800);
      return () => clearTimeout(delay);
    }
  }, [charIndex, sloganIndex]);

  const handleWelcome = () => {
    router.push('/signup');
  };

  /* useEffect(() => {
    const animate = async () => {
      await leftDivAni([
        [leftDiv.current, { opacity: 1, x: 0, y: 0 }, { duration: 0.5, ease: 'easeOut' }]
      ]);

      await rightPointAni([
        [rightPoint.current, { opacity: 1, x: -100, y: 0 }, { duration: 0.5 }],
        [rightPoint.current, { x: 0, y: [0, -20, 0] }, { duration: 0.5, ease: 'easeInOut' }],
      ]);

      await rightDivAni([
        [rightDiv.current, { opacity: 1, x: 0, y: 0 }, { duration: 0.6, ease: 'easeOut' }]
      ]);

      await leftPointAni([
        [leftPoint.current, { opacity: 1, x: 100, y: 0 }, { duration: 0.5 }],
        [leftPoint.current, { y: [0, 30, 0] }, { duration: 0.5, ease: 'easeInOut' }]
      ]);
    };

    animate();
  }, []); */

  return (
    <section
      /* style={{ cursor: `url(${images.CursorYou}) 4 4, auto` }} */
      className="py-20 md:py-10 relative overflow-x-clip"
    >
     {/*  <div
        initial={{ opacity: 0, x: 200, y: 100 }}
        ref={leftPoint}
        className="absolute hidden lg:block z-50"
        style={{ left: '64%' }}
      >
        <Pointer text="Mojo_Rojo" style={colors.newGreen} />
      </motion.div> */}

     {/*  <motion.div
        initial={{ opacity: 0, x: -200, y: 100 }}
        ref={rightPoint}
        className="absolute hidden lg:block z-70"
        style={{ left: '27%', top: '90%' }}
      >
        <Pointer text="Yahiko" font="white" style={colors.rose} />
      </motion.div>
 */}
     {/*  <motion.div
        drag
        initial={{ opacity: 0, x: -100, y: 100 }}
        ref={leftDiv}
        className="absolute -left-8 hidden lg:block top-44 z-30"
      >
        <img
          draggable={false}
          src={images.DESIGNONE}
          className="w-[450px]"
          alt=""
        />
      </motion.div> */}

     {/*  <motion.div
        drag
        initial={{ opacity: 0, x: 100, y: 100 }}
        ref={rightDiv}
        className="absolute z-30 right-13 hidden lg:block top-14"
      >
        <img
          draggable={false}
          src={images.DESIGNTHREE}
          className="w-[300px]"
          alt=""
        />
      </motion.div> */}

      <div className="container mx-auto">
        <div className="flex justify-center">
          <div
            className="inline-flex   text-lg md:text-2xl py-1 px-4 rounded-full "
            style={{
             
              fontFamily: 'monospace',
              fontWeight: 500,
            }}
          >
  <h1 className=' flex items-center'>
    AI + Website builder <div className='ml-2 mr-2'>
        <span className='opacity-100' >/</span>
        <span className='opacity-50'>/</span>
        <span className='opacity-30'>/</span>
        </div> India
  </h1>
          </div>
        </div>

        <div className="flex items-center mt-4 px-2 md:px-0 flex-col text-center">
          <h1 className="text-3xl md:text-8xl" style={{ fontFamily: 'poppins', fontWeight: 700 }}>
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-500 bg-clip-text text-transparent" >FingAI.</span> ships it anyway
          </h1>
          <h1 className="text-2xl md:text-7xl mt-2 " style={{ fontFamily: 'poppins', fontWeight: 700 }}>
            {text}|
          </h1>
          <p className="text-xs md:text-md  mt-5" style={{ fontFamily: 'monospace' }}>
  <span className="text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text">
    FingAI
  </span>{' '}
  simplifies your{' '}
  <span className="text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text">
    website creation
  </span>{' '}
  process with intelligent{' '}
  <span className="text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text">
    design automation
  </span>{' '}
  and real-time optimization.
</p>
<p className="text-sm md:text-md  " style={{ fontFamily: 'monospace' }}>
  From{' '}
  <span className="text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text">
    layout generation
  </span>{' '}
  to{' '}
  <span className="text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text">
    content suggestions
  </span>
  , everything is streamlined — no manual coding, no hassle.
</p>

        </div>

        <div className='px-5 md:px-30 lg:px-52 mx-auto mt-5'>
        <HeroForm  />
        </div>
      </div>
    </section>
  );
};

export default Hero;
