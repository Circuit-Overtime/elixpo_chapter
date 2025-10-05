'use client'

import { useAppDispatch, useAppSelector } from "@/redux/store"

export const UseProjectCreation = () => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.profile)
     

     const createProject = async () => {
         
     }
    const isCreating = async () => {
         
    }
    const canCreate = async () => { 
      
        
    }

    return {
        createProject,
        isCreating,
        canCreate
    }
}