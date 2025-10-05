'use client'

import { createProjectStart } from "@/redux/slices/project";
import { useAppDispatch, useAppSelector } from "@/redux/store"
import { toast } from "sonner";

export const UseProjectCreation = () => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.profile)
    const projectState = useAppSelector((state) => state.projects);

     const createProject = async () => {
         if(!user?.id) {
             toast.error('Please Sign-in to create project')
             return
         } 
         dispatch(createProjectStart())
     }
    const isCreating = async () => {
         
    }
    const canCreate = async () => { 
      
        
    }

    return {
       
    }
}