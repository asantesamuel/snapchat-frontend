import { apiClient } from './client';
import type {
  RequestUploadDto, UploadUrlResponse, ConfirmUploadDto,
} from '@/types/media.types';

export const mediaApi = {
  requestUpload: (dto: RequestUploadDto) =>
    apiClient.post<UploadUrlResponse>('/api/media/presign', dto)
      .then(r => r.data),

  // uploads binary file directly to S3 — does NOT use apiClient
  // presigned PUT URL requires no Authorization header
  // adding one would break the S3 signature validation
  uploadToS3: async (uploadUrl: string, file: Blob, mimeType: string) => {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': mimeType },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[S3 Upload Error]', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          uploadUrl: uploadUrl.split('?')[0], // log URL without signature
        });
        
        if (response.status === 403) {
          throw new Error('S3 CORS error: Check backend CORS configuration for http://localhost:5173');
        }
        throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[S3 Upload Fetch Error]', err);
      throw err;
    }
  },

  confirmUpload: (mediaId: string, dto: ConfirmUploadDto) =>
    apiClient.post(`/api/media/${mediaId}/confirm`, dto)
      .then(r => r.data),

  getSecureUrl: (mediaId: string) =>
    apiClient.get<{ url: string; expiresInSeconds: number }>(
      `/api/media/${mediaId}/url`
    ).then(r => r.data),
};