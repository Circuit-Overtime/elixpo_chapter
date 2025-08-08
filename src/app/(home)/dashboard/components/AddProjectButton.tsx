import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import React from 'react'
import GlowingGradientText from '../../components/GlowingText'
import Image from 'next/image'
import { IMAES } from '../../../../../public/assets/images/images'

const AddProjectButton = () => {
  return (
    <div className="group ">
      <div className='flex justify-between items-center gap-4 md:gap-10 pl-3 md:pl-6  bg-muted border-white/15 border transition-transform duration-300 scale-100 group-hover:scale-105'>
         <div className="flex items-center gap-2">
          <Button className="transition-transform bg-transparent hover:bg-transparent duration-300 group-hover:rotate-90">
            <Plus className="size-5 text-muted dark:text-foreground" />
          </Button> 
          <div className="flex flex-col w-fit">
            <span className="font-mono ">Add Project</span>
            <GlowingGradientText>
              Create a Playground
            </GlowingGradientText>
          </div>
        </div>

        <div className='relative '>
                  <div className="absolute inset-0 z-0 bg-gradient-to-l from-pink-500/30 via-pink-500/10 to-transparent" />
    
            <Image alt='' src={IMAES.ProjectButton} className='w-24 md:w-32' />
        </div>
      </div>
    </div>
  )
}

export default AddProjectButton




