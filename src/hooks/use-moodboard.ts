import React, { useEffect, useState } from "react"
import {MoodboardImageProps} from "../redux/api/moodboard/index"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { mutation } from "../../convex/_generated/server"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { fa } from "zod/v4/locales"
import { Id } from "../../convex/_generated/dataModel"
interface StyleFormData {
     images: MoodboardImageProps[ ]
}
export const useMoodBoard = (guideImage: MoodboardImageProps[]) => {
     const [dragActive, setActiveDrag] = useState(false)
     const searchParams = useSearchParams();
     const projectId = searchParams.get('project')
     
     const form = useForm<StyleFormData>({
         defaultValues: {
            images: []
         }
     })
     const {watch, setValue, getValues} = form
     const images = watch('images');
     const generateMoodboardUrl = useMutation(
        api.moodboard.generatedUploadedUrl
     )
     const removeMoodboardImage = useMutation(
        api.moodboard.removeMoodBoardImage
     )
     useEffect(() => {
    if (!guideImage || guideImage.length === 0) return;

    // Convert server images
    const serverImages: MoodboardImageProps[] = guideImage.map((img: any) => ({
      id: img.id,
      preview: img.url,
      storageId: img.storageId,
      uploaded: true,
      uploading: false,
      isFromServer: true,
    }));

    // Get existing images
    const currentImages = getValues("images");

    // Merge without duplicating
    const mergedImages = [
      ...serverImages,
      ...currentImages.filter(
        (clientImg) =>
          !serverImages.some(
            (serverImg) => serverImg.storageId === clientImg.storageId
          )
      ),
    ];

    // Clean up any blob URLs from client images replaced by server images
    currentImages.forEach((clientImg) => {
      const replacedByServer = serverImages.find(
        (s) => s.storageId === clientImg.storageId
      );
      if (replacedByServer && clientImg.preview.startsWith("blob:")) {
        URL.revokeObjectURL(clientImg.preview);
      }
    });

    setValue("images", mergedImages);
  }, [guideImage, setValue, getValues]);

     const addImage = (file: File) => {
         if(images.length > 5) {
             toast.error('maximun 5 images allowed')
             return
         }

         const newImage: MoodboardImageProps = {
             id: `${Date.now()}-${Math.random()}`,
             file,
             preview: URL.createObjectURL(file),
             uploaded: false,
             uploading: false,
             isFromServer: false
         }
         const updatedImages = [...images, newImage]
         setValue('images',updatedImages)

         toast.success('Images added to mood board')
     }
    const removeImage = async (imageId: string) => {
         const imageToRemove = images.find((img) => img.id === imageId)
         if(!imageToRemove) return

         //if its a server image with storageId, remove it from convex 
         if(imageToRemove.isFromServer && imageToRemove.storageId && projectId) {
            try{
             await removeMoodboardImage({
                projectId: projectId as Id<'projects'>,
                storageId: imageToRemove.storageId as Id<'_storage'>
             })
            }catch(error){
               console.log(error);
               toast.error('failed to remove image from server')
               return
               
            }
         }
         const updateImages = images.filter((img) => {
             if(img.id === imageId) {
                 if(!img.isFromServer && img.preview.startsWith('blob:')) {
                     URL.revokeObjectURL(img.preview)
                 }
                 return false
             }
             return true 
         })
         setValue('images', updateImages)
         toast.success('images removed')
    }

    const handleDrag = (e: React.DragEvent) => {
         e.preventDefault()
         e.stopPropagation()

         if(e.type === 'dragenter' || e.type === 'dragover') {
             setActiveDrag(true)

         }else if(e.type === 'dragleave') {
              setActiveDrag(false)
         }
    }

     const handleDragDrop = (e: React.DragEvent) => {
         e.preventDefault()
         e.stopPropagation()
         setActiveDrag(true)

         const files = Array.from(e.dataTransfer.files)
         const imageFiles = files.filter((file) => file.type.startsWith('image/'))

         if(imageFiles.length === 0) {
             toast.error('Please drop image files only')
             return
         }

         imageFiles.forEach((file) => {
             if(images.length < 5) {
                 addImage(file)
             }
         })
     }
   
}