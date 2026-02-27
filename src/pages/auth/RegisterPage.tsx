import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { registerSchema, type RegisterFormData } from '@/utils/validation';
import { useAuth } from '@/hooks/useAuth';

// password strength indicator
const PasswordRules = ({ password }: { password: string }) => {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter',  met: /[A-Z]/.test(password) },
    { label: 'One number',            met: /[0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {rules.map(rule => (
        <div key={rule.label} className="flex items-center gap-2">
          {rule.met
            ? <CheckCircle2 className="w-3.5 h-3.5 text-[#FFFC00] shrink-0" />
            : <XCircle className="w-3.5 h-3.5 text-white/20 shrink-0" />}
          <span className={`text-xs ${rule.met ? 'text-white/60' : 'text-white/25'}`}>
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
     } catch (err: unknown) {
      const message = (err as unknown as { response: { data: { message: string } } })?.response?.data?.message || (err as Error)?.message || 'Invalid email or password';
      toast.error(message);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start snapping with your friends"
      bottomText="Already have an account?"
      bottomLinkText="Log in"
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Username"
          type="text"
          placeholder="yourname"
          autoComplete="username"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-1">
          <Input
            label="Password"
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
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordRules password={password} />
        </div>

        {/* terms notice */}
        <p className="text-white/30 text-xs text-center leading-relaxed">
          By signing up you agree to our{' '}
          <span className="text-[#FFFC00]">Terms of Service</span>
          {' '}and{' '}
          <span className="text-[#FFFC00]">Privacy Policy</span>
        </p>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="mt-1"
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;