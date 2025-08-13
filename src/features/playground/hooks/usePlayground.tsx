import { useCallback, useState } from "react";
import { TemplateFolder } from "../lib/path-to-json";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TRPCError } from "@trpc/server";

interface PlayGroundData {
  id: string;
  name?: string;
  [key: string]: any;
}

interface usePlayGroundReturn {
  playgroundData: PlayGroundData | null;
  templateData: TemplateFolder | null;
  isLoading: boolean;
  error: string | null;
  loadPlayground: () => Promise<void>;
  saveTemplateData: (data: string) => Promise<void>;
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

  const saveTemplateData = useCallback(
    async (data: string) => {
      if (!id) return;
      await saveCodeMutation.mutateAsync({
        playgroundId: id,
        data: JSON.parse(data), // Ensure JSON object
      });
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
