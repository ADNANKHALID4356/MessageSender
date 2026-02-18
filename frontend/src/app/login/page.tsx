'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrorSummary } from '@/components/ui/form-field';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login, isLoading } = useAuthStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const isAdminLogin = searchParams.get('admin') === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data, isAdminLogin);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
        variant: 'default',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if it's a 404 or admin doesn't exist
      if (isAdminLogin && (error.status === 401 || error.message?.includes('Invalid credentials'))) {
        toast({
          title: 'Login failed',
          description: error.message || 'Invalid credentials. If you haven\'t created an admin account yet, please sign up first.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login failed',
          description: error.message || 'Invalid credentials. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">MessageSender</span>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isAdminLogin ? 'Admin Login' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-center">
              {isAdminLogin
                ? 'Sign in to your admin account'
                : 'Sign in to your account to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Error Summary */}
              {Object.keys(errors).length > 0 && (
                <FormErrorSummary errors={errors} />
              )}

              {/* Username/Email Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className={errors.username ? 'text-destructive' : ''}>
                  {isAdminLogin ? 'Username' : 'Email'}
                </Label>
                <Input
                  id="username"
                  type={isAdminLogin ? 'text' : 'email'}
                  placeholder={isAdminLogin ? 'Enter username' : 'Enter your email'}
                  {...register('username')}
                  className={errors.username ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  autoComplete={isAdminLogin ? 'username' : 'email'}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
                {errors.username && (
                  <p id="username-error" role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className={errors.password ? 'text-destructive' : ''}>Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className={errors.password ? 'border-destructive focus-visible:ring-destructive/30 pr-10' : 'pr-10'}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* Switch Login Type */}
            <div className="mt-6 text-center text-sm">
              {isAdminLogin ? (
                <p className="text-muted-foreground">
                  Not an admin?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    User login
                  </Link>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Are you an admin?{' '}
                  <Link href="/login?admin=true" className="text-primary hover:underline font-medium">
                    Admin login
                  </Link>
                </p>
              )}
            </div>

            {/* Signup Link */}
            <div className="mt-4 text-center text-sm">
              <p className="text-muted-foreground">
                Don&apos;t have an account?{' '}
                {isAdminLogin ? (
                  <Link href="/admin/signup" className="text-primary hover:underline font-medium">
                    Create admin account
                  </Link>
                ) : (
                  <Link href="/signup" className="text-primary hover:underline font-medium">
                    Register here
                  </Link>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          © 2026 MessageSender. Professional Facebook Messaging Platform.
        </p>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">MessageSender</span>
          </div>
        </div>
        <Card className="shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
