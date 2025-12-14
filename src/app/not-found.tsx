import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-platinum via-white to-brand-platinum p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

      <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border-0 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="h-10 w-10 text-brand-gold" />
        </div>

        <h1 className="text-6xl font-bold text-brand-navy mb-2">404</h1>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">
          Page Not Found
        </h2>
        <p className="text-brand-charcoal mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
          >
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

