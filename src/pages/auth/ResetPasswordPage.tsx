import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/utils/validation';
import { authApi } from '@/api/auth.api';

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [success, setSuccess]             = useState(false);
  const [searchParams]                    = useSearchParams();

  // the token arrives as a query parameter in the reset link
  // e.g. /reset-password?token=eyJhbGci...
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }
    try {
      await authApi.resetPassword({ token, newPassword: data.newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const message = (err as unknown as { response: { data: { message: string } } })?.response?.data?.message || (err as Error)?.message || 'Invalid email or password';
      toast.error(message);
    }
  };

  // missing token in URL
  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This reset link is not valid">
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-white/50 text-sm text-center">
            Please request a new password reset link.
          </p>
          <Link to="/forgot-password">
            <Button variant="primary">Request New Link</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // success state
  if (success) {
    return (
      <AuthLayout title="Password updated!" subtitle="Your password has been changed">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#FFFC00]/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-[#FFFC00]" />
            </div>
            <div className="absolute inset-0 rounded-full bg-[#FFFC00]/10 animate-ping" />
          </div>
          <p className="text-white/60 text-sm text-center">
            Your password has been updated successfully. You can now log in with your new password.
          </p>
          <Link to="/login" className="w-full">
            <Button size="lg" className="w-full">Log In</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Create a strong password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="text-white/40 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <Input
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Repeat your password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="text-white/40 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;