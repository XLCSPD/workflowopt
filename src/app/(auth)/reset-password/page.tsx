"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VersatexLogo } from "@/components/branding/VersatexLogo";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const supabase = getSupabaseClient();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // User should have a session from the recovery link
      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for auth state changes (recovery link will trigger this)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: string) => {
            if (event === "PASSWORD_RECOVERY") {
              setIsValidSession(true);
            }
          }
        );

        // Give it a moment to process the recovery token
        setTimeout(() => {
          if (isValidSession === null) {
            setIsValidSession(false);
          }
        }, 2000);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, [supabase.auth, isValidSession]);

  async function onSubmit(data: ResetPasswordFormData) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset.",
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />
        <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold mb-4" />
            <p className="text-brand-charcoal">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired session
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

        <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-brand-navy">
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-brand-charcoal mt-2">
                This password reset link is invalid or has expired.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Button
              className="w-full h-11 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-semibold"
              onClick={() => router.push("/forgot-password")}
            >
              Request New Reset Link
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center text-sm">
            <Link
              href="/login"
              className="flex items-center gap-2 text-brand-charcoal hover:text-brand-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

        <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-brand-emerald/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-brand-emerald" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-brand-navy">
                Password Reset Complete
              </CardTitle>
              <CardDescription className="text-brand-charcoal mt-2">
                Your password has been successfully updated. You&apos;ll be
                redirected to the login page shortly.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Button
              className="w-full h-11 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-semibold"
              onClick={() => router.push("/login")}
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

      <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <VersatexLogo variant="auth" priority />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-brand-navy">
              Reset Password
            </CardTitle>
            <CardDescription className="text-brand-charcoal">
              Enter your new password below
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center text-sm">
          <Link
            href="/login"
            className="flex items-center gap-2 text-brand-charcoal hover:text-brand-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

