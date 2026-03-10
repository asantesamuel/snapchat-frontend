import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "@/components/auth/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { loginSchema, type LoginFormData } from "@/utils/validation";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
    } catch (err: unknown) {
      const message =
        (err as unknown as { response: { data: { message: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Invalid email or password";
      toast.error(message);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue snapping"
      bottomText="Don't have an account?"
      bottomLinkText="Sign up"
      bottomLinkTo="/register"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 mt-2"
      >
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4 text-white/40" />}
          error={errors.email?.message}
          className="bg-white/5 border border-white/10 focus:border-[#FFFC00] focus:ring-1 focus:ring-[#FFFC00]/40 backdrop-blur-md"
          {...register("email")}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="current-password"
          leftIcon={<Lock className="w-4 h-4 text-white/40" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-white/40 hover:text-[#FFFC00] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          error={errors.password?.message}
          className="bg-white/5 border border-white/10 focus:border-[#FFFC00] focus:ring-1 focus:ring-[#FFFC00]/40 backdrop-blur-md"
          {...register("password")}
        />

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-white/50 hover:text-[#FFFC00] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="mt-3 bg-[#FFFC00] text-black font-semibold hover:bg-yellow-300 transition-all duration-200 shadow-md shadow-yellow-500/20"
        >
          {isSubmitting ? "Signing in..." : "Log In"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;