"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Mail } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
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

const acceptInviteSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

export default function AcceptInvitePage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [isChecking, setIsChecking] = useState(true);
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [email, setEmail] = useState<string>("");
  const [invitationId, setInvitationId] = useState<string | undefined>(undefined);

  const form = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const appName = useMemo(() => "ProcessOpt", []);

  // Wait for the invite session to be established.
  useEffect(() => {
    let mounted = true;

    const hydrateFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mounted) return;

      if (session?.user?.email) {
        setIsValidSession(true);
        setEmail(session.user.email);
        const meta = (session.user.user_metadata || {}) as Record<string, unknown>;
        const metaName = typeof meta.name === "string" ? meta.name : "";
        const metaInvitationId =
          typeof meta.invitation_id === "string" ? meta.invitation_id : undefined;
        setInvitationId(metaInvitationId);
        if (metaName) form.setValue("name", metaName);
        setIsChecking(false);
        return;
      }

      // Listen for auth state changes triggered by Supabase invite link
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;
        if (newSession?.user?.email) {
          setIsValidSession(true);
          setEmail(newSession.user.email);
          const meta = (newSession.user.user_metadata || {}) as Record<string, unknown>;
          const metaName = typeof meta.name === "string" ? meta.name : "";
          const metaInvitationId =
            typeof meta.invitation_id === "string" ? meta.invitation_id : undefined;
          setInvitationId(metaInvitationId);
          if (metaName) form.setValue("name", metaName);
          setIsChecking(false);
        }
        }
      );

      // Give it a moment to process the invite token
      window.setTimeout(() => {
        if (!mounted) return;
        setIsChecking(false);
      }, 2500);

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    };

    void hydrateFromSession();

    return () => {
      mounted = false;
    };
  }, [form, supabase.auth]);

  async function onSubmit(data: AcceptInviteFormData) {
    setIsSubmitting(true);
    try {
      // Set password + profile name
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
        data: {
          name: data.name,
        },
      });

      if (updateError) {
        toast({
          variant: "destructive",
          title: "Could not complete setup",
          description: updateError.message,
        });
        return;
      }

      // Mark invitation accepted + sync org/role on public.users (server-side)
      const res = await fetch("/api/users/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          variant: "destructive",
          title: "Setup completed, but membership sync failed",
          description:
            body.error ||
            "Your account was created but we couldn't finalize your org access. Please contact an admin.",
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: "Welcome!",
        description: "Your account is ready. Redirecting to the app...",
      });

      window.setTimeout(() => {
        router.push("/workflows");
      }, 1500);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />
        <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold mb-4" />
            <p className="text-brand-charcoal">Verifying invite link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
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
                Invalid Invite Link
              </CardTitle>
              <CardDescription className="text-brand-charcoal mt-2">
                This invite link is invalid or has expired. Ask your admin to resend it.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              className="w-full h-11 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-semibold"
              onClick={() => router.push("/login")}
            >
              Go to Login
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
                Setup Complete
              </CardTitle>
              <CardDescription className="text-brand-charcoal mt-2">
                You&apos;re all set. Redirecting you to {appName}...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              className="w-full h-11 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-semibold"
              onClick={() => router.push("/workflows")}
            >
              Continue
            </Button>
          </CardContent>
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
            <VersatexLogo variant="auth" priority />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-brand-navy">
              Accept Invitation
            </CardTitle>
            <CardDescription className="text-brand-charcoal">
              Finish setting up your account to join the organization.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="truncate">{email}</span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Create Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" className="h-11" {...field} />
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
                      <Input type="password" placeholder="********" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing setup...
                  </>
                ) : (
                  "Complete Setup"
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

