import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import type { UpdateProfileDto } from '@/types/user.types';
import imageCompression from 'browser-image-compression';

export const PROFILE_KEY = ['profile', 'me'] as const;

export const useProfile = () => {
  const queryClient         = useQueryClient();
  const { updateUser }      = useAuthStore();

  // ── Fetch own full profile ─────────────────────────────────────────
  // staleTime of 5 minutes — profile data rarely changes
  const profileQuery = useQuery({
    queryKey: PROFILE_KEY,
    queryFn:  () => usersApi.getMe(),
    staleTime: 5 * 60 * 1000,
  });

  // ── Update username and/or bio ─────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: (dto: UpdateProfileDto) => usersApi.updateMe(dto),
    onSuccess: (updatedUser) => {
      // update the React Query cache so ProfilePage reflects the change instantly
      queryClient.setQueryData(PROFILE_KEY, updatedUser);
      // also update the Zustand auth store so the header/avatar
      // throughout the app reflects the new username immediately
      updateUser({
        username:  updatedUser.username,
        avatarUrl: updatedUser.avatarUrl,
        bioText:   updatedUser.bioText,
      });
      toast.success('Profile updated!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not update profile');
    },
  });

  // ── Upload a new avatar ────────────────────────────────────────────
  // full three-step presign → S3 PUT → confirm flow
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: compress the image client-side before uploading
      // reduces a 4MB photo to ~300KB without visible quality loss
      const compressed = await imageCompression(file, {
        maxSizeMB:           1,
        maxWidthOrHeight:    800,
        useWebWorker:        true,
        fileType:            'image/jpeg',
      });

      // Step 2: get file extension for presign request
      const ext = 'jpg';

      // Step 3: request presigned URL from backend
      const { uploadUrl, fileUrl } = await usersApi.requestAvatarUpload(ext);

      // Step 4: PUT compressed image directly to S3
      // no Authorization header — S3 uses the embedded signature in the URL
      await fetch(uploadUrl, {
        method:  'PUT',
        body:    compressed,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      // Step 5: confirm the upload with the backend
      return usersApi.confirmAvatarUpload(fileUrl);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(PROFILE_KEY, updatedUser);
      updateUser({ avatarUrl: updatedUser.avatarUrl });
      toast.success('Avatar updated!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Avatar upload failed');
    },
  });

  return {
    profile:          profileQuery.data,
    isLoading:        profileQuery.isLoading,
    updateProfile:    updateProfile.mutate,
    isUpdating:       updateProfile.isPending,
    uploadAvatar:     uploadAvatar.mutate,
    isUploadingAvatar: uploadAvatar.isPending,
  };
};