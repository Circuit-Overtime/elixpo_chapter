import { cn } from '@/lib/utils';
import React from 'react'

type Props = {
    colorGuide: any[]
}

type ColorThemeProps = {
     title: string;
     swatches: Array<{
         name: string
         hexColor: string
         description: string
     }>;
     className?: string
}

export const ThemeContent = ({colorGuide}: Props) => {
  return (
    <div className='flex flex-col gap-10'>
       <div className='flex flex-col gap-10'>
          {
            colorGuide.map((section:any, i: number) => (
               <ColorTheme
                key={i}
                title={section.name}
                swatches={section.swatches}
               />
            ) )
          }
       </div>
    </div>
  )
}





export const ColorTheme = (
   {swatches,title,className}: ColorThemeProps
) => {
    return (
        <div className={cn(
              'flex flex-col gap-5', className
        )}>
         <div>
            <h3 className='text-lg font-mono' >{title}</h3>
         </div>
         <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
           {
            swatches.map((sw) => (
                <div key={sw.name}>
                   <ColorSwatches
                   name={sw.name}
                   value={sw.hexColor}

                   />
                   {sw.description && (
                     <p className='font-mono text-xs'>{sw.description}</p>
                   )}
                </div>
            ))
           }
         </div>
        </div>
    )
}

type ColorSwatchProps = {
     name: string;
     value: string;
     className?: string;
}
const ColorSwatches = ({name,value, className}: ColorSwatchProps) => {
     return (
         <div className={cn(
            'flex items-center gap-3', className
         )}>
            <div 
            style={{backgroundColor: value}}
            className='w-12 h-12 rounded-lg border border-border/20 flex-shrink-0'
            
            />
            <div>
                <h4 className='text-sm font-mono'>{name}</h4>
                 <p className='font-mono text-xs uppercase'>{value}</p>
            </div>
         </div>
     )
}