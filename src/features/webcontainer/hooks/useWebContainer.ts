import React, { useState, useEffect, useCallback } from "react";
import { WebContainer } from '@webcontainer/api'
import { TemplateFolder } from "../../playground/lib/path-to-json";
import { UseWebContainerPros, UseWebContainerReturn } from "../types/types";

// Singleton WebContainer instance
let webContainerInstance: WebContainer | null = null;
let isBooting = false;

const getWebContainerInstance = async (): Promise<WebContainer> => {
  if (webContainerInstance) {
    return webContainerInstance;
  }

  if (isBooting) {
    // Wait for the booting to complete
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (webContainerInstance) {
          clearInterval(checkInterval);
          resolve(webContainerInstance);
        }
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error("WebContainer boot timeout"));
        }, 10000);
      }, 100);
    });
  }

  isBooting = true;
  try {
    webContainerInstance = await WebContainer.boot();
    isBooting = false;
    return webContainerInstance;
  } catch (error) {
    isBooting = false;
    throw error;
  }
};

export const useWebContainer = ({templateData}: UseWebContainerPros) => {
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [instance, setInstance] = useState<WebContainer | null>(null);

    useEffect(() => {
         let isMounted = true;

         async function initializeWebContainer() {
             try {
               const webcontainer = await getWebContainerInstance();
               if (!isMounted) return;
               
               setInstance(webcontainer);
               setIsLoading(false);

             } catch (error) {
                console.error("Failed to initiate WebContainer", error);
                if (isMounted) {
                    setError(error instanceof Error ? error.message : "Failed to initiate WebContainer");
                    setIsLoading(false);
                }
             }
         }

         initializeWebContainer();

         return () => {
             isMounted = false;
             // Don't teardown here as we want to keep the singleton instance
         };
    }, []);

    const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
         if (!instance) {
             throw new Error("WebContainer instance is missing");
         }
         try {
            const pathParts = path.split("/");
            const folderPath = pathParts.slice(0, -1).join("/");

            if (folderPath) {
                 await instance.fs.mkdir(folderPath, { recursive: true });
            }
            await instance.fs.writeFile(path, content);
         } catch (error) {
            console.error("Failed to write file:", error);
            throw error;
         }
    }, [instance]);

    const destroy = useCallback(() => {
         if (instance) {
             // Only teardown if we're the ones who created it
             if (webContainerInstance === instance) {
                 instance.teardown();
                 webContainerInstance = null;
             }
             setInstance(null);
         }
    }, [instance]);

    return {
         destroy,
         error,
         isLoading,
         instance,
         serverUrl,
         writeFileSync
    };
};