import { FrameShape } from "@/redux/slices/shapes"
import { AppDispatch } from "@/redux/store"
import { useState } from "react"
import { useDispatch } from "react-redux"

export const useCanvas = (shape: FrameShape) => {
    const [isGenerating, setIsGenerating] = useState(false)

    const dispatch = useDispatch<AppDispatch>()
    const handleGenerateDesign = () => {}
    
    return {
         isGenerating,
         handleGenerateDesign
    }
}