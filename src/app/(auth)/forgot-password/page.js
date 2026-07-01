"use client";



import { useState } from "react";

import Link from "next/link";

import { motion, AnimatePresence } from "framer-motion";

import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";

import { AuthFormPanel } from "@/components/auth/auth-form-panel";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { api } from "@/lib/api-client";



export default function ForgotPasswordPage() {

  const [identifier, setIdentifier] = useState("");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  const [maskedEmail, setMaskedEmail] = useState("");

  const [devResetUrl, setDevResetUrl] = useState("");



  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");

    setLoading(true);

    try {

      const isEmail = identifier.includes("@");

      const data = await api.forgotPassword(

        isEmail ? { email: identifier } : { employeeCode: identifier }

      );

      setMaskedEmail(isEmail ? identifier : "your registered email");

      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);

      setSuccess(true);

    } catch (err) {

      setError(err.message || "Request failed");

    }

    setLoading(false);

  };



  return (

    <div className="flex min-h-screen flex-col lg:flex-row">

      <AuthHeroPanel />



      <AuthFormPanel>

        <AnimatePresence mode="wait">

          {!success ? (

            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <div className="mb-6 flex justify-center lg:justify-start">

                <Link

                  href="/login"

                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"

                >

                  <ArrowLeft className="h-4 w-4" /> Back to Login

                </Link>

              </div>



              <h2 className="mb-2 font-display text-2xl font-bold">Forgot Password?</h2>

              <p className="mb-8 text-muted-foreground">

                Enter your Employee Code or registered Email. We&apos;ll send a secure reset link.

              </p>



              <form onSubmit={handleSubmit} className="space-y-5 [&_label]:text-center lg:[&_label]:text-left">

                <div className="space-y-2">

                  <Label htmlFor="identifier">Employee Code or Email</Label>

                  <div className="relative">

                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input

                      id="identifier"

                      placeholder="EMP001 or your.email@company.com"

                      value={identifier}

                      onChange={(e) => setIdentifier(e.target.value)}

                      className="h-12 pl-9"

                      required

                    />

                  </div>

                </div>



                {error && (

                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive">

                    {error}

                  </motion.p>

                )}



                <Button type="submit" variant="premium" className="h-12 w-full text-base" disabled={loading}>

                  {loading ? (

                    <motion.div

                      animate={{ rotate: 360 }}

                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}

                      className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"

                    />

                  ) : (

                    "Send Reset Link"

                  )}

                </Button>

              </form>

            </motion.div>

          ) : (

            <motion.div

              key="success"

              initial={{ opacity: 0, scale: 0.95 }}

              animate={{ opacity: 1, scale: 1 }}

              className="text-center"

            >

              <motion.div

                initial={{ scale: 0 }}

                animate={{ scale: 1 }}

                transition={{ type: "spring", delay: 0.2 }}

                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"

              >

                <CheckCircle2 className="h-8 w-8 text-emerald-500" />

              </motion.div>



              <h2 className="mb-2 font-display text-2xl font-bold">Check Your Email</h2>

              <p className="mb-2 text-muted-foreground">We&apos;ve sent a secure password reset link to</p>

              <p className="mb-6 font-medium text-champagne">{maskedEmail}</p>

              <p className="mb-4 text-sm text-muted-foreground">

                The link expires in 1 hour. Check your spam folder if you don&apos;t see it.

              </p>



              {devResetUrl && (

                <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs">

                  <p className="font-medium text-amber-700 dark:text-amber-400">

                    Dev mode — reset link (email not configured):

                  </p>

                  <a href={devResetUrl} className="mt-1 block break-all text-champagne underline">

                    {devResetUrl}

                  </a>

                </div>

              )}



              <div className="flex flex-col gap-3">

                <Button

                  variant="outline"

                  className="h-12"

                  onClick={() => {

                    setSuccess(false);

                    setIdentifier("");

                    setDevResetUrl("");

                  }}

                >

                  Try Another Account

                </Button>

                <Link href="/login">

                  <Button variant="premium" className="h-12 w-full text-base">

                    Back to Login

                  </Button>

                </Link>

              </div>

            </motion.div>

          )}

        </AnimatePresence>

      </AuthFormPanel>

    </div>

  );

}


