
import { ThemeContent } from '@/components/style-guide/theme-content'
import { TabsContent } from '@/components/ui/tabs'
import { mockStyleGuide } from '@/constant/mockdata'
import { MoodBoardQuery, StyleGuideQuery } from '@/convex/query.config'
import { MoodboardImageProps } from '@/redux/api/moodboard'
import { StyleGuide } from '@/redux/api/style-guide'
import { Palette } from 'lucide-react'
import React from 'react'

interface Props {
 searchParams: Promise<{
    project: string
 }>
}

const Page = async ({ searchParams }: Props) => {
  const projectId = (await searchParams).project

  

  // Safe to query now
  const existingStyleGuide = await StyleGuideQuery(projectId)
  const guide = existingStyleGuide?.styleGuide?._valueJSON as unknown as StyleGuide
  const colorGuide = guide?.colorSection || []
  const typography = guide?.typographySection || []
  const existingMoodBoard = await MoodBoardQuery(projectId)
  const guideImage = existingMoodBoard.imges?._valueJSON as unknown as MoodboardImageProps[] || []
   const formattedColorGuide = mockStyleGuide.colorSection.map((section) => ({
    title: section.title,
    swatches: section.swatchs.map((sw) => ({
      name: sw.name,
      hexColor: sw.hexColor,
      description: sw.description,
    })),
  }));
  return (
    <div>
        <TabsContent
        value='colors'
        className='space-y-8'
        >
         {
            !guideImage.length ? (
               <div className='space-y-8'>
                <div className='text-center py-25' >
                  <div className='flex-col flex items-center '>
                     <div className='bg-muted w-16 h-16 rounded-md  flex items-center justify-center'>
                         <Palette className='w-8 h-8 text-muted-foreground' />
                     </div>
                     <span className='capitalize mt-3 font-black text-2xl' style={{fontFamily: 'var(--font-montserrat-alternates)'}}>No Color Generated Yet</span>
                     <p className='font-mono text-xs md:text-md mt-1 opacity-50'>Upload images to your mood board and generate an AI-powered style guide with colors and typography.</p>
                  </div>
                </div>
               </div>
            ): (
                <ThemeContent  colorGuide={formattedColorGuide} />
            )
         }
        </TabsContent>
    </div>
  )
}

export default Page
