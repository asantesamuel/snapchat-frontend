import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import AvatarUploader from '@/components/ui/AvatarUploader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { updateProfileSchema, type UpdateProfileFormData } from '@/utils/validation';

// EditProfilePage handles two distinct operations:
// 1. Avatar upload — handled immediately on file selection (no save button needed)
//    the three-step presign→S3→confirm flow runs inside uploadAvatar mutation
// 2. Username / bio update — handled via react-hook-form on explicit save
//    the form is only dirty (saveable) when values differ from defaults
//    this prevents unnecessary API calls when nothing has changed

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile, isUpdating, uploadAvatar, isUploadingAvatar } =
    useProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: profile?.username || '',
      bioText:  profile?.bioText  || '',
    },
  });

  // when profile loads, reset the form with the real values
  // this covers the case where the query resolves after the form renders
  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username,
        bioText:  profile.bioText || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: UpdateProfileFormData) => {
    updateProfile(data, {
      onSuccess: () => navigate('/profile'),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-6">
        <button
          onClick={() => navigate(-1)}
          title="Go back"
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <h1 className="text-white font-black text-lg">Edit Profile</h1>
        <div className="w-9" />
      </div>

      <div className="px-6 flex flex-col gap-8">

        {/* ── Avatar section ──────────────────────────────────────────── */}
        {/* avatar upload is independent of the form — it saves immediately */}
        <div className="flex flex-col items-center gap-3">
          <AvatarUploader
            currentUrl={profile?.avatarUrl}
            username={profile?.username || ''}
            isUploading={isUploadingAvatar}
            onFileSelect={uploadAvatar}
            size="xl"
          />
          <p className="text-white/30 text-sm">Tap to change photo</p>
        </div>

        {/* ── Profile form ────────────────────────────────────────────── */}
        {/* react-hook-form: isDirty is true only when values differ from defaults */}
        {/* the save button is disabled when !isDirty to prevent pointless requests */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

          <Input
            label="Username"
            placeholder="yourname"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />

          {/* bio textarea — not using Input component because we need a textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              Bio
            </label>
            <textarea
              placeholder="Tell people a little about yourself..."
              rows={3}
              maxLength={150}
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 transition-all focus:outline-none focus:border-[#FFFC00] focus:bg-white/[0.08] resize-none text-sm leading-relaxed"
              {...register('bioText')}
            />
            {errors.bioText && (
              <p className="text-red-400 text-xs">{errors.bioText.message}</p>
            )}
          </div>

          {/* save button — disabled when nothing has changed */}
          {/* isDirty from react-hook-form tracks whether any field */}
          {/* differs from its defaultValue */}
          <Button
            type="submit"
            size="lg"
            loading={isUpdating}
            disabled={!isDirty || isUpdating}
            className="mt-2"
          >
            <Save className="w-4 h-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>

          {!isDirty && (
            <p className="text-white/25 text-xs text-center -mt-2">
              No changes to save
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;