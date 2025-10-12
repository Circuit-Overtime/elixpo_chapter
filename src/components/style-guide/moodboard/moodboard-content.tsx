'use client'
import { MoodboardImageProps } from "@/redux/api/moodboard";
import { ImageIcon, PlusCircle, SparklesIcon } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { useMoodBoard } from "@/hooks/use-moodboard";
import { Button } from "../../ui/button";
import ImageBoard from "./image-board";

type MoodboardProps = {
  moodboardGuide: MoodboardImageProps[];
};

const MoodBoardContent = ({ moodboardGuide }: MoodboardProps) => {
   const isEmpty = !moodboardGuide || moodboardGuide.length === 0;
  const {
    addImage,
    canAddmore,
    form,
    handleDrag,
    handleDragDrop,
    handleFileInput,
    images,
    removeImage
  } = useMoodBoard(moodboardGuide)

  return (
   <div className="flex flex-col gap-5">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDragDrop}
        className={cn(
            "relative border-2 border-dashed border-muted-foreground/30 rounded-3xl p-12 text-center transition-all duration-200 min-h-[400px] flex items-center justify-center overflow-hidden",
            
        )}>
          {/* Pattern background only inside */}
          <span className="font-mono absolute top-5 left-8 font-bold">Mood Board</span>
          <div
  className="absolute inset-0 -z-10 
  bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px),radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)]
  dark:bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px),radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)]
  [background-position:0_0,8px_8px]
  [background-size:16px_28px]"
/>

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-20 rounded-3xl" />

          {
            images.length > 0 && 
            <>
            <div className="lg:hidden absolute inset-0 flex items-center justify-center">
               <div className="relative w-[150px]">
                 {
                    images.map((img,i) => {
                        const seed = img.id.split('').reduce((a,b) => a+b.charCodeAt(0),0);
                        const random1 = ((seed * 9301 + 49297) % 233280) /233280;
                        const random2 =  (((seed + 1) * 9301 + 49297)% 233280) / 233280 
                        const random3 =  (((seed + 2) * 9301 + 49297)% 233280) / 233280 
                        const rotation = (random1 - 0.5) * 30;
                        const XOffSet = (random2 - 0.5) * 20;
                        const yOffSet = (random3 - 0.5) * 10;
                         return (
                             <ImageBoard
                              key={`mobile-${img.id}`}
                              rotation={rotation}
                              xOffset={XOffSet}
                              yOffset={yOffSet}
                              image={img}
                              marginLeft='-100px'
                              marginTop={"-96px"}
                              zIndex={i + 1}
                              removeImage={removeImage}
                             />
                         )
                    })
                 }
               </div>
            </div>
            </>
          }
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between px-0 md:px-2">
           <span className="font-mono text-xs opacity-70 font-light w-fit text-center md:w-[30%]">Just drag and drop images here to create a mood board and we will create a style guide for you. </span>

           <Button
            className="font-mono font-bold mt-3 md:mt-0 capitalize rounded-3xl" 
            variant={'default'}

           >
           <SparklesIcon className="fill-amber-300"/> Generate With AI
           </Button>
          </div> 
   </div>
  );
};

export default MoodBoardContent;
