import React, { useState, useEffect, useCallback } from "react";
import { WebContainer } from '@webcontainer/api'
import { TemplateFolder } from "../../playground/lib/path-to-json";
import { UseWebContainerPros, UseWebContainerReturn } from "../types/types";


export const useWebContainer = ({templateData}: UseWebContainerPros) => {
    const [serverUrl,setServerUrl] = useState<string | null>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error,setError] = useState<string | null>("")
    const [instance,setInstance] = useState<WebContainer | null>(null)

    useEffect(() => {
         let isMount = true

         async function initializedWebContainer () {
             try {
               const webcontainer = await WebContainer.boot();
               if(!isMount) return 
               setInstance(webcontainer);
               setIsLoading(false)

             } catch (error) {
                console.log("Failed to initiate Webcontainer",error);
                if(isMount) {
                    setError(error instanceof Error ? error.message : "Failed to initiate Webcontainer");
                    setIsLoading(false)
                }
             }
         }
         initializedWebContainer();

         return () => {
             isMount = false;
             if(instance) {
                 instance.teardown()
             }
         }
    },[])

    const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
         if(!instance) {
             throw new Error("Webcontainer instance is missing")
         }
         try {
            const pathParts = path.split("/");
            const folderPath = pathParts.slice(0, -1).join("/");

            if(folderPath) {
                 await instance.fs.mkdir(folderPath, { recursive: true})
            }
            await instance.fs.writeFile(path, content)
         } catch (error) {
            
         }
    },[instance]);

    const destroy = useCallback(() => {
         if(instance) {
             instance.teardown()
             setInstance(null)
         }

    },[instance])

    return {
         destroy,
         error,
         isLoading,
         instance,
         serverUrl,
         writeFileSync
    }
}


