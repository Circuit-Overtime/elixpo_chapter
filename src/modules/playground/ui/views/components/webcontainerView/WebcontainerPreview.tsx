"use client"
import { Progress } from '@/components/ui/progress'
import { TemplateFolder } from '@/features/playground/lib/path-to-json'
import { transformToWebContainerFormat } from '@/features/webcontainer/hooks/transformers'
import { WebContainer } from '@webcontainer/api'
import { CheckCircle, Loader2, LoaderCircle, LucideCheckCircle, XCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface WebContainerPreviewProps {
    templateData: TemplateFolder
    serverUrl: string
    isLoading: boolean
    error: string | null
    instance: WebContainer | null
    writeFileSync: (path: string, content: string) => Promise<void>
    forceResetup?: boolean
}

const WebcontainerPreview = ({
    error,
    instance,
    isLoading,
    serverUrl,
    templateData,
    writeFileSync,
    forceResetup=false
}: WebContainerPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
        starting: false,
    ready: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  useEffect(() => {
      if(forceResetup) {
         setIsSetupComplete(false)
         setIsSetupInProgress(false)
         setPreviewUrl("")
         setCurrentStep(0)
         setLoadingState({
            transforming: false,
            installing: false,
            mounting: false,
            ready: false,
            starting: false
         })
      }
  },[forceResetup])

  useEffect(() =>  {
    async function setWebContainer() {
        if(!instance || isSetupComplete || isSetupInProgress) return;

        try {
           setIsSetupInProgress(true);
           setSetupError(null);

           try {
             const packageJsonExist = await instance.fs.readFile("package.json","utf-8");

             if(packageJsonExist) {
                 //terminal related stuff
             }

             instance.on("server-ready", (port: number, url: string) => {
                   console.log(`Reconnect to server on port ${port} at ${url}`);


                   setPreviewUrl(url);
                   setLoadingState((prev) => ({
                      ...prev,
                      starting: false,
                      ready: true
                   }));
                   setIsSetupComplete(true)
                   setIsSetupInProgress(false)
             })
             setCurrentStep(4);
             setLoadingState((prev) => ({...prev, starting: true}));
             return
           } catch (error) {
            
           }
           //transform data
           setLoadingState((prev) => ({...prev, transforming: true}));
           setCurrentStep(1);

           //terminal stuff

           //@ts-ignore
           const files = transformToWebContainerFormat(templateData);

           setLoadingState((prev) => ({
             ...prev, 
             transforming: false,
             mounting: true
           }));
           setCurrentStep(2);

           //terminal related Stuff;

           await instance.mount(files);

           setLoadingState((prev) => ({
             ...prev,
             mounting: false,
             installing: true
           }));

           setCurrentStep(3);

           //terminal related Stuff


           const installationProcess = await instance.spawn("npm", ["install"]);
           installationProcess.output.pipeTo(
             new WritableStream({
                 write( data ) {
                     //write directly in the terminal
                 }
             })
           );

           const installExitCode = await installationProcess.exit;

           if(installExitCode !== 0) {
             console.log(`Failed to install dependencies, Exit code: ${installExitCode}`)
           };

           setLoadingState((prev) => ({
             ...prev,
             installing: false,
             starting: true
           }));

           setCurrentStep(4);

           const startProcess = await instance.spawn("npm", ["run", "start"]);

           //listen for server ready event

           instance.on("server-ready",(port: number, url: string) => {
              console.log(`Server is running on ${port} at ${url}`)


              setPreviewUrl(url);

              setLoadingState((prev) => ({
                 ...prev,
                 starting: false,
                 ready: true
              }));

              setIsSetupComplete(true);
              setIsSetupInProgress(false)
           });


           //handel startProcess output;

           startProcess.output.pipeTo(
              new WritableStream({
                 write ( data ) {
                     
                 }
              })
           )

        } catch (error) {
           console.log(`Error setting up Webcontainer`,error);
           const errorMsg = error instanceof Error ? error.message : String(error);

           setSetupError(errorMsg);
           setIsSetupInProgress(false);
           setLoadingState({
             transforming: false,
             installing: false,
             mounting: false,
            ready: false,
            starting: false
           })
        }
    }

    setWebContainer()
  },[
    instance,
    templateData,
    isSetupComplete,
    isSetupInProgress
  ])

  useEffect(() => {
     return () => {

     }
  }, [])


   if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error || setupError}</p>
        </div>
      </div>
    );
  }

   const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <LucideCheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <LoaderCircle className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;
    
    return (
      <span className={`text-sm font-mono font-bold ${
        isComplete ? 'text-green-300' : 
        isActive ? 'text-blue-300' : 
        'text-gray-500'
      }`}>
        {label}
      </span>
    );
  };
  return (
     
     <div className='flex flex-col h-full w-full'>
      {
        !previewUrl ? (
           <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
           

            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Transforming template data")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                {getStepText(4, "Starting development server")}
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 p-4">
           {/*  <TerminalComponent 
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            /> */}
          </div>
        </div>
        ) : (
            <div className='h-full flex flex-col'>
               <div className='flex-1'>
                 <iframe src={previewUrl} className='h-full w-full border-none' 
                  title='Webcontainer Preview'
                 />
               </div>

               <div className='h-64 border-t'>
               <h1> Terminal Components</h1>
               </div>
            </div>
        )
      }

     </div>
  )
     
}

export default WebcontainerPreview