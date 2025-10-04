import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const combineSlug = (name: string, maxLen=80):string => {
   const baseName = name
   if(!baseName) return 'vision_guest'
   let s = baseName
        .normalize('NFKC')
        .replace(/\p{M}+/gu,"")
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        if(!s) s = 'untitled'
        if(s.length > maxLen) s = s.slice(0, maxLen)
        return s 
}