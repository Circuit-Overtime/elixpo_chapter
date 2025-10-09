export interface MoodboardImageProps {
     id: string;
     file?: string;
     preview: string;
     storageId?: string;
     uploaded: boolean;
     uploading: boolean
     error?: string;
     url?: string;
     isFromServer?: boolean;
}