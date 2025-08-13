import React from 'react'
import { Button } from '../ui/button'
import { ChevronRight } from 'lucide-react'

interface Props {
     children: React.ReactNode,
     onClick?: () => void
}
const GradientButton = ({children,onClick}:Props) => {
  return (
    <Button
         onClick={onClick}
         className='relative overflow-hidden font-mono  rounded-none  text-white 
                               bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 
                               bg-[length:200%_200%]'
                    style={{
                      animation: 'shine 2s linear infinite',
                      backgroundSize: '200% 200%',
                      backgroundPosition: '0% 50%',
                    }}>
                            {children}

                             <ChevronRight/>
                          </Button>
  )
}

export default GradientButton