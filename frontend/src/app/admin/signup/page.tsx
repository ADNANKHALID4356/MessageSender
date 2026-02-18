'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, MessageSquare, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrorSummary, PasswordStrengthIndicator } from '@/components/ui/form-field';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

const adminSignupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type AdminSignupFormData = z.infer<typeof adminSignupSchema>;

export default function AdminSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser, setAuthenticated } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AdminSignupFormData>({
    resolver: zodResolver(adminSignupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
    mode: 'onTouched',
  });

  const passwordValue = watch('password', '');

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { exists } = await authService.checkAdminExists();
        setAdminExists(exists);
        if (exists) {
          toast({
            title: 'Admin exists',
            description: 'An admin account already exists. Please login instead.',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('Error checking admin:', error);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, [toast]);

  const onSubmit = async (data: AdminSignupFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.adminSignup(data);
      setUser(response.user);
      setAuthenticated(true);
      
      toast({
        title: 'Welcome!',
        description: 'Admin account created successfully. Setting up your workspace...',
        variant: 'default',
      });
      
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.response?.data?.message || 'Failed to create admin account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Admin Account Exists</CardTitle>
            <CardDescription>
              An admin account has already been created for this system.
              Please login with your admin credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login?admin=true">Go to Admin Login</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Not an admin?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Register as user
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Admin Setup</span>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Create Admin Account
            </CardTitle>
            <CardDescription className="text-center">
              Set up the primary administrator account for your messaging platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Error Summary */}
              {Object.keys(errors).length > 0 && (
                <FormErrorSummary errors={errors} />
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className={errors.username ? 'text-destructive' : ''}>Username *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  {...register('username')}
                  className={errors.username ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  autoComplete="username"
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

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className={errors.email ? 'text-destructive' : ''}>Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Name Fields (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    {...register('firstName')}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    {...register('lastName')}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className={errors.password ? 'text-destructive' : ''}>Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    {...register('password')}
                    className={errors.password ? 'border-destructive focus-visible:ring-destructive/30 pr-10' : 'pr-10'}
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.password.message}
                  </p>
                )}
                {passwordValue.length > 0 && (
                  <div id="password-strength">
                    <PasswordStrengthIndicator password={passwordValue} />
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={errors.confirmPassword ? 'text-destructive' : ''}>Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/30 pr-10' : 'pr-10'}
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Admin Account'
                )}
              </Button>
            </form>

            {/* Already have admin? */}
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an admin account?{' '}
                <Link href="/login?admin=true" className="text-primary hover:underline font-medium">
                  Login here
                </Link>
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
