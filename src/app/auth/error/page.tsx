import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Authentication Error
        </h1>
        <p className="text-slate-500 mb-6">
          There was a problem signing you in. Please try again or contact
          your institute IT support.
        </p>
        <Button asChild variant="primary">
          <Link href="/auth/login">Back to Login</Link>
        </Button>
      </div>
    </div>
  );
}
