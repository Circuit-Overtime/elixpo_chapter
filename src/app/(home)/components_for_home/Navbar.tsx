"use client"
import Image from 'next/image'
import React, {  useEffect, useState } from 'react'
import { LOGO } from '../../../../public/assets/images/images'
import { Blocks, Code, FileCode, GitBranch, HandPlatter, Moon} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ThemeToggleButton from '@/components/ui/theme-toggle-button'
import { useTheme } from 'next-themes'
import { BsDiscord } from "react-icons/bs";
import { ExpandedTabs } from '@/components/ui/expanded-tabs'

const Navbar = () => {
 // const [isOpen, setIsOpen] = useState(false);
  const {theme} = useTheme()
   const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Prevents SSR/client mismatch
    return null;
  }
  /*  const menuRef = useRef<HTMLDivElement>(null); */
  const options = [
    {
       title: "Docs",
       href: "/docs",
        icon: FileCode
    },
    {
        title: "Components",
        href: "/components",
        icon: Code
    },
    {
        title: "Themes",
        href: "/themes",
        icon: Moon
    },
    {
        title: "Color",
         href: "/color",
        icon: HandPlatter
    },
    {
        title: "Blocks",
        href: "/block",
        icon: Blocks
    }
  ]
  return (
      <section className="py-3 sticky top-0 z-50">
      <div className="container  px-4 md:px-10 lg:px-2 mx-auto">
        <div className="flex items-center justify-between  rounded-full   px-4 md:px-0">
          {/* Logo */}
           <div className='flex items-center gap-2'>
            <Image
             
              src={theme === "dark" ? LOGO.DARK_LOGO : LOGO.LIGHT_LOGO}
             alt='logo'
             className='w-10 h-10 object-contain'
            />
            <span className='font-mono'>FingUI.</span>
           </div>

          {/* Desktop Nav */}
          

          {/* Right Section */}
         <div className=' gap-5 hidden md:block'>
        
         <ExpandedTabs 
         className='mt-2'
         tabs={options} />
         </div>


         <div>
           <div className='flex items-center'>
            <Button
            className=' py-2 px-3'
            variant={"ghost"}>
                <Link
                 href={"https://github.com/IgYaHiko"}
                >   
                <GitBranch className='size-4'/>
                </Link>
            </Button>
            <ThemeToggleButton
             variant='circle-blur'
             />
              <Button
            className=' py-2 px-3'
            variant={"ghost"}>
                <Link
                 href={"https://discord.gg/rNChHMcGdG"}
                >   
               <BsDiscord className='size-4'/>
                </Link>
            </Button>

           </div>
         </div>
        </div>

    
      </div>
    </section>
  )
}

export default Navbar
