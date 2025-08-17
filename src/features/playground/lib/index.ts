import { TemplateFile, TemplateFolder } from "./path-to-json";

export function findFilePath(
  file: TemplateFile,
  folder: TemplateFolder | null | undefined, // Allow null/undefined
  pathSoFar: string[] = []
): string | null {
  // Add null/undefined checks
  if (!folder || !folder.items) {
    return null;
  }

  for (const item of folder.items) {
    if ("folderName" in item) {
      const res = findFilePath(file, item, [...pathSoFar, item.folderName]);
      if (res) return res;
    } else {
      if (
        item.filename === file.filename &&
        item.fileExtension === file.fileExtension
      ) {
        return [
          ...pathSoFar,
          item.filename + (item.fileExtension ? "." + item.fileExtension : ""),
        ].join("/");
      }
    }
  }
  return null;
}

export async function longPoll<T>(
  url: string,
  options: RequestInit,
  checkCondition: (response: T) => boolean,
  interval: number = 1000,
  timeout: number = 10000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: T = await response.json();

      if (checkCondition(data)) {
        return data;
      }

      if (Date.now() - startTime >= timeout) {
        throw new Error("Long polling timed out");
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error("Error during long polling:", error);
      throw error;
    }
  }
}

export const generateFileId = (
  file: TemplateFile,
  rootFolder: TemplateFolder | null | undefined
): string => {
  // Add null check for rootFolder
  if (!rootFolder) {
    const extension = file.fileExtension?.trim();
    const extensionSuffix = extension ? `.${extension}` : '';
    return `${file.filename}${extensionSuffix}`;
  }

  const path = findFilePath(file, rootFolder)?.replace(/^\/+/, '') || '';
  const extension = file.fileExtension?.trim();
  const extensionSuffix = extension ? `.${extension}` : '';

  return path
    ? `${path}/${file.filename}${extensionSuffix}`
    : `${file.filename}${extensionSuffix}`;
}