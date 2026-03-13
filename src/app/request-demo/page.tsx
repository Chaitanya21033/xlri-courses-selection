"use client";

import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

export default function RequestDemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="bg-slate-900 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-3">
            Get Started
          </p>
          <h1 className="text-4xl font-bold text-white mb-4">Request a Demo</h1>
          <p className="text-slate-400 text-lg">
            Tell us about your institution and we'll schedule a personalised walkthrough of the BidScholar platform.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Thank you — we'll be in touch shortly.
              </h2>
              <p className="text-slate-600">
                Our team typically responds within one business day to schedule your walkthrough.
              </p>
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                In the meantime, explore our demo portal with the credentials on the{" "}
                <a href="/auth/login" className="font-semibold underline">
                  login page
                </a>
                .
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input id="firstName" placeholder="Arjun" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input id="lastName" placeholder="Mehta" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Institutional email *</Label>
                <Input id="email" type="email" placeholder="you@institution.edu" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="institution">Institution name *</Label>
                <Input id="institution" placeholder="e.g. Xavier Labour Relations Institute" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Your role *</Label>
                <Input id="role" placeholder="e.g. Programme Director, Academic Dean" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="students">Approximate student cohort size</Label>
                <Input id="students" type="number" placeholder="e.g. 600" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">What's your main allocation challenge?</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your current process, pain points, or specific requirements…"
                  rows={4}
                />
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "Submitting…" : "Request Demo"}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                We respect your privacy. Your information will only be used to schedule and conduct the demo.
              </p>
            </form>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
