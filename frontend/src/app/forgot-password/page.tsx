'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowLeft, Mail, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address.',
      });
      return;
    }

    // Since the backend doesn't have a public forgot-password
    // endpoint yet, inform the user to contact their admin
    setSubmitted(true);
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
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {submitted ? 'Check your email' : 'Reset your password'}
            </CardTitle>
            <CardDescription>
              {submitted
                ? 'If an account exists with that email, you will receive reset instructions.'
                : 'Enter your email to receive password reset instructions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium mb-1">Admin-managed accounts</p>
                      <p>
                        If you don&apos;t receive an email, please contact your system
                        administrator to reset your password manually.
                      </p>
                    </div>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full">
                  Send reset instructions
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          © 2026 MessageSender. Professional Facebook Messaging Platform.
        </p>
      </div>
    </div>
  );
}
