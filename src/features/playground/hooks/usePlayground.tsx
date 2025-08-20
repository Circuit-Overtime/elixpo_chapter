"use client";
import { useCallback, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TRPCError } from "@trpc/server";
import { TemplateFolder } from "./types/tpyes";

interface PlayGroundData {
  id: string;
  title?: string;
  [key: string]: any;
}

interface usePlayGroundReturn {
  playgroundData: PlayGroundData | null;
  templateData: TemplateFolder | null;
  isLoading: boolean;
  error: string | null;
  loadPlayground: () => Promise<void>;
  saveTemplateData: (data: TemplateFolder | string) => Promise<void>; // Changed from string to TemplateFolder | string
  isSaving: boolean;
}

export const usePlayground = (id: string): usePlayGroundReturn => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { refetch } = useQuery({
    ...trpc.playground.getPlayground.queryOptions({ id }),
    enabled: false,
  });

  const [playgroundData, setPlaygroundData] = useState<PlayGroundData | null>(null);
  const [template, setTemplate] = useState<TemplateFolder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Mutation for saving template
  const saveCodeMutation = useMutation(trpc.playground.saveCode.mutationOptions({
    onSuccess: () => {
      toast.success("Template saved successfully");
      queryClient.invalidateQueries({
        queryKey: [["playground", { id }]],
      });
    },
    onError: (err) => {
      console.error("Failed to save template", err);
      toast.error("Failed to save template");
    },
  })) 

  const loadPlayground = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);

      const res = await refetch();
      if (res.data) {
        setPlaygroundData(res.data);
        const rawContent = res.data.templateFiles?.[0]?.content;

        if (typeof rawContent === "string") {
          try {
            const parsedData: TemplateFolder = JSON.parse(rawContent);
            setTemplate(parsedData);
            toast.success("Playground Data Loaded");
          } catch {
            setError("Failed to parse template data");
          }
        }
      }

      const response = await fetch(`/api/template/${id}`);
      if (!response.ok) throw new TRPCError({ code: "PARSE_ERROR" });

      const templateRes = await response.json();
      if (templateRes.templateJson && Array.isArray(templateRes.templateJson)) {
        setTemplate({
          folderName: "Root",
          items: templateRes.templateJson,
        });
      } else {
        setTemplate(
          templateRes.templateJson || {
            folderName: "Root",
            items: [],
          }
        );
      }
      toast.success("Template Loaded Successfully");
    } catch (error: any) {
      console.log("Failed to load", error);
      setError("Failed to load playground");
      toast.error("Failed to load playground");
    } finally {
      setIsLoading(false);
    }
  }, [id, refetch]);

  // In your usePlayground hook, change the saveTemplateData function:
const saveTemplateData = useCallback(
  async (data: TemplateFolder | string): Promise<void> => { // Add Promise<void> return type
    if (!id) {
      console.error('❌ No playground ID provided');
      return;
    }
    
    console.log('💾 saveTemplateData called with data type:', typeof data);
    
    try {
      // If data is already a string, use it directly
      // If it's an object, stringify it for the backend
      const dataToSave = typeof data === 'string' ? data : JSON.stringify(data);
      
      console.log('📦 Sending to backend, data length:', dataToSave.length);
      
      await saveCodeMutation.mutateAsync({ // Remove the result assignment
        playgroundId: id,
        data: dataToSave,
      });
      
      console.log('✅ Backend save successful');
      // Don't return anything (void)
    } catch (error) {
      console.error('❌ Error in saveTemplateData:', error);
      toast.error('Failed to save changes');
      throw error;
    }
  },
  [id, saveCodeMutation]
);

  return {
    playgroundData,
    templateData: template,
    isLoading,
    error,
    loadPlayground,
    saveTemplateData,
    isSaving: saveCodeMutation.isPending, // ✅ expose loading state for UI
  };
};
