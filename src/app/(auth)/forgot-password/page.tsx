"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const supabase = getSupabaseClient();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        return;
      }

      setIsEmailSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
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

  if (isEmailSent) {
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
                Check Your Email
              </CardTitle>
              <CardDescription className="text-brand-charcoal mt-2">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-medium">{form.getValues("email")}</span>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="bg-brand-platinum/50 rounded-lg p-4 text-sm text-brand-charcoal">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-brand-gold" />
                <div>
                  <p className="font-medium">Didn&apos;t receive the email?</p>
                  <p className="mt-1 text-muted-foreground">
                    Check your spam folder or try resending.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsEmailSent(false)}
            >
              Try another email
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

      <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-xl bg-brand-gold flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-brand-navy">PO</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-brand-navy">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-brand-charcoal">
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@company.com"
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
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
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

