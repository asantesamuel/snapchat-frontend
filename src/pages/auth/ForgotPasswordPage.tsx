import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
// import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { forgotPasswordSchema, type ForgotPasswordData } from '@/utils/validation';
import { authApi } from '@/api/auth.api';

const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordData) => {
    try {
      await authApi.forgotPassword(data);
      setSentEmail(data.email);
      setSent(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: unknown) {
      // always show success — backend never reveals if email exists
      setSentEmail(data.email);
      setSent(true);
    }
  };

  // success state
  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Reset link on its way">
        <div className="flex flex-col items-center gap-6 py-4">
          {/* animated checkmark */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#FFFC00]/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-[#FFFC00]" />
            </div>
            <div className="absolute inset-0 rounded-full bg-[#FFFC00]/10 animate-ping" />
          </div>

          <div className="text-center">
            <p className="text-white/60 text-sm leading-relaxed">
              If an account exists for{' '}
              <span className="text-white font-semibold">{sentEmail}</span>,
              you will receive a password reset link shortly.
            </p>
            <p className="text-white/30 text-xs mt-3">
              Check your spam folder if you don't see it.
            </p>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-2 text-[#FFFC00] text-sm font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link"
      bottomText="Remember your password?"
      bottomLinkText="Log in"
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;