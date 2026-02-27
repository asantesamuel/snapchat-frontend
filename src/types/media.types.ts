export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export interface RequestUploadDto {
  mediaType: MediaType;
  mimeType: string;
  fileSize: number;
  duration?: number;
}

export interface UploadUrlResponse {
  mediaId: string;
  uploadUrl: string;
  fileUrl: string;
  s3Key: string;
  expiresInSeconds: number;
}

export interface ConfirmUploadDto {
  s3Key: string;
  fileSize: number;
  duration?: number;
}