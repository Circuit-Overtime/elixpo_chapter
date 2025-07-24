import React from 'react'
import GlowingGradientText from './GlowingText'
import Image from 'next/image'
import { IMAES } from '../../../../public/assets/images/images'

const ProductShowCase = () => {
  return (
    <section className='py-0 md:py-10 mx-auto'>
      <div className='container '>
        <div className='text-center'>
           <button className='uppercase mx-auto border text-md flex items-center py-1 px-3 rounded-md gap-2' style={{ fontFamily: "monospace", fontWeight: 600,}}>Booste Your Productivity</button>
        </div>
        <div className='flex text-4xl md:text-7xl font-bold mt-1 md:mt-2 flex-col items-center '>
            <h1>A more effient way</h1>
             <h1><div className='flex items-center gap-2'>to build Next.Js <GlowingGradientText children={"App"} /></div> </h1>
            <div className='mt-3 px-3'>
                 <p className='text-center text-xs font-medium font-mono'>FingAI turns your ideas into fully responsive websites using AI-</p>
             <p className='text-center text-xs font-mono font-medium'>instantly, beautifully, and without writing a single line of code.</p>
            </div>
        </div>
        <div className='mt-5 rounded-lg relative'>
           <div
  className="relative group w-full max-w-6xl mx-auto p-4"
  style={{ perspective: '1000px' }}
>
  <div
    className="rounded-2xl overflow-hidden bg-black bg-opacity-50 backdrop-blur-md border border-pink-500/30 shadow-2xl transition-transform duration-500 ease-in-out group-hover:rotate-x-[10deg] group-hover:rotate-y-[5deg]"
    style={{
      transformStyle: 'preserve-3d',
    }}
  >
    <Image
      src={IMAES.Tesiti}
      alt="preview"
      className="w-full h-auto object-cover rounded-2xl"
    />
  </div>

  {/* Glow layer */}
  <div className="absolute -inset-1 -z-10 blur-2xl opacity-70 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500 animate-pulse pointer-events-none" />
</div>

            <Image
             src={IMAES.Tube}
             alt=''
             width={262}
             height={262}
             className='hidden md:block absolute -right-36 -top-32'
            />
             <Image
             src={IMAES.Pyramid}
             alt=''
             width={262}
             height={262}
             className='hidden md:block absolute bottom-24 -left-36'
            />
        </div>
      </div>
    </section>
  )
}

export default ProductShowCase