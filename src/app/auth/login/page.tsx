"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Lock, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  const demoAccounts = [
    { label: "Admin", email: "admin@xlri.ac.in", password: "demo1234" },
    { label: "Professor", email: "prof.sharma@xlri.ac.in", password: "demo1234" },
    { label: "BM Student", email: "bm001@xlri.ac.in", password: "demo1234" },
    { label: "HRM Student", email: "hrm001@xlri.ac.in", password: "demo1234" },
  ];

  return (
    <div className="max-w-sm w-full mx-auto">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <span className="text-slate-900 text-lg font-semibold">BidScholar</span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in to portal</h2>
      <p className="text-slate-500 text-sm mb-8">
        Use your institutional credentials to access the bidding platform.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4 mr-2 inline" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@xlri.ac.in"
              className="pl-9"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9 pr-9"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Demo accounts */}
      <div className="mt-8">
        <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">
          Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {demoAccounts.map((acc) => (
            <button
              key={acc.label}
              type="button"
              onClick={() => {
                setEmail(acc.email);
                setPassword(acc.password);
              }}
              className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <p className="text-xs font-semibold text-slate-700">{acc.label}</p>
              <p className="text-xs text-slate-400 truncate">{acc.email}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          All demo accounts use password: <code className="bg-slate-100 px-1 rounded">demo1234</code>
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        Facing login issues?{" "}
        <a href="/faq#login" className="text-indigo-600 hover:underline">
          See FAQ
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">
              BidScholar
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Elective Course Bidding Platform
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Fair, transparent, and auditable course allocation for graduate
            management programmes. Built for institutional rigour.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-indigo-400" />
            </div>
            <p className="text-slate-400 text-sm">
              Market-based bidding with real-time MRB updates
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-indigo-400" />
            </div>
            <p className="text-slate-400 text-sm">
              Pre-declared tie-break policies for full transparency
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-indigo-400" />
            </div>
            <p className="text-slate-400 text-sm">
              Complete audit trail of all allocation decisions
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <Suspense fallback={<div className="max-w-sm w-full mx-auto text-slate-500 text-sm">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
