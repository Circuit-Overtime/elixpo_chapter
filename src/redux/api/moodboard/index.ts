export interface MoodboardImageProps {
     id: string;
     file?: File | string;
     preview: string;
     storageId?: string;
     uploaded: boolean;
     uploading: boolean
     error?: string;
     url?: string;
     isFromServer?: boolean;
}