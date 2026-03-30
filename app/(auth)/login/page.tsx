"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Suspense, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X } from "lucide-react";

type AuthMode = "signin" | "signup";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const hasAccessDeniedError = searchParams.get("error") === "access_denied";
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
    if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  }, [password]);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (mode === "signup") {
      if (touched.name && !name.trim()) errors.name = "Name is required";
      if (touched.phone && phone && !PHONE_REGEX.test(phone)) errors.phone = "Invalid phone number";
      if (touched.email && !email.trim()) errors.email = "Email is required";
      else if (touched.email && !EMAIL_REGEX.test(email)) errors.email = "Invalid email format";
      if (touched.password && password.length < 8) errors.password = "Password must be at least 8 characters";
      if (touched.confirmPassword && password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    } else {
      if (touched.identifier && !identifier.trim()) errors.identifier = "Email is required";
      else if (touched.identifier && !EMAIL_REGEX.test(identifier)) errors.identifier = "Invalid email format";
      if (touched.password && !password) errors.password = "Password is required";
    }

    return errors;
  }, [mode, name, phone, email, password, confirmPassword, identifier, touched]);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl, prompt: "select_account" });
    } catch {
      toast.error("Failed to connect to Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  const validateSignIn = (): boolean => {
    const loginEmail = identifier.trim();
    if (!loginEmail) {
      toast.error("Please enter your email address");
      return false;
    }
    if (!EMAIL_REGEX.test(loginEmail)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!password) {
      toast.error("Please enter your password");
      return false;
    }
    return true;
  };

  const validateSignUp = (): boolean => {
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      toast.error("Please enter a valid phone number");
      return false;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleCredentialsSignIn = async () => {
    if (!validateSignIn()) return;

    const loginEmail = identifier.trim().toLowerCase();
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: loginEmail,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        toast.error("Invalid email or password. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Connection error. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!validateSignUp()) return;

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      password,
    };

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMessage = data?.error || "Unable to create account. Please try again later.";
        if (res.status === 409) {
          toast.error("An account with this email already exists. Please sign in instead.");
        } else if (res.status === 400) {
          toast.error(errorMessage);
        } else {
          // Show actual error for debugging, but also log it
          console.error("Registration failed:", res.status, data);
          toast.error(errorMessage);
        }
        return;
      }

      const signInResult = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        toast.success("Account created! Please sign in with your new credentials.");
        setMode("signin");
        setIdentifier(payload.email);
        setPassword("");
        return;
      }

      toast.success("Account created successfully!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Connection error. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || googleLoading) return;
    if (mode === "signin") {
      handleCredentialsSignIn();
    } else {
      handleCreateAccount();
    }
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setTouched({});
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#14161d] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(22,78,176,0.25),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(44,146,102,0.18),transparent_30%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl"
      >
        <div className="mb-7 flex items-center justify-center">
          <Logo size="large" />
        </div>

        <div className="rounded-3xl border border-white/15 bg-[#1b1d25]/95 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Log in to EcoReceipt</h1>
          <p className="mt-2 text-sm text-slate-300">
            Access your shop dashboard, inventory, and digital billing in one place.
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-full border border-slate-600/60 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-[#0a66cc] text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-[#0a66cc] text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder="Full name"
                    autoComplete="name"
                    className={`h-14 rounded-2xl border-slate-600 bg-[#1d2029] px-5 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#0a84ff] ${
                      validationErrors.name ? "border-red-500" : ""
                    }`}
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-xs text-red-400">{validationErrors.name}</p>
                  )}
                </div>
                <div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    placeholder="Phone number (optional)"
                    autoComplete="tel"
                    type="tel"
                    className={`h-14 rounded-2xl border-slate-600 bg-[#1d2029] px-5 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#0a84ff] ${
                      validationErrors.phone ? "border-red-500" : ""
                    }`}
                  />
                  {validationErrors.phone && (
                    <p className="mt-1 text-xs text-red-400">{validationErrors.phone}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <Input
                value={mode === "signin" ? identifier : email}
                onChange={(e) =>
                  mode === "signin"
                    ? setIdentifier(e.target.value)
                    : setEmail(e.target.value)
                }
                onBlur={() => handleBlur(mode === "signin" ? "identifier" : "email")}
                placeholder={mode === "signin" ? "Email" : "Email address"}
                type="email"
                autoComplete="email"
                className={`h-14 rounded-2xl border-slate-600 bg-[#1d2029] px-5 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#0a84ff] ${
                  validationErrors[mode === "signin" ? "identifier" : "email"] ? "border-red-500" : ""
                }`}
              />
              {validationErrors[mode === "signin" ? "identifier" : "email"] && (
                <p className="mt-1 text-xs text-red-400">
                  {validationErrors[mode === "signin" ? "identifier" : "email"]}
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  placeholder="Password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className={`h-14 rounded-2xl border-slate-600 bg-[#1d2029] px-5 pr-12 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#0a84ff] ${
                    validationErrors.password ? "border-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.password}</p>
              )}
              {mode === "signup" && password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs ${
                      passwordStrength.score <= 1 ? "text-red-400" :
                      passwordStrength.score <= 2 ? "text-orange-400" :
                      passwordStrength.score <= 3 ? "text-yellow-400" : "text-green-400"
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      {password.length >= 8 ? <Check size={12} className="text-green-400" /> : <X size={12} className="text-slate-500" />}
                      8+ characters
                    </div>
                    <div className="flex items-center gap-1">
                      {/[A-Z]/.test(password) ? <Check size={12} className="text-green-400" /> : <X size={12} className="text-slate-500" />}
                      Uppercase
                    </div>
                    <div className="flex items-center gap-1">
                      {/\d/.test(password) ? <Check size={12} className="text-green-400" /> : <X size={12} className="text-slate-500" />}
                      Number
                    </div>
                    <div className="flex items-center gap-1">
                      {/[^a-zA-Z0-9]/.test(password) ? <Check size={12} className="text-green-400" /> : <X size={12} className="text-slate-500" />}
                      Special char
                    </div>
                  </div>
                </div>
              )}
            </div>

            {mode === "signup" && (
              <div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className={`h-14 rounded-2xl border-slate-600 bg-[#1d2029] px-5 pr-12 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#0a84ff] ${
                      validationErrors.confirmPassword ? "border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">{validationErrors.confirmPassword}</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                    <Check size={12} /> Passwords match
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-[#0a66cc] text-base font-semibold text-white hover:bg-[#0b73e6] disabled:opacity-50"
              disabled={submitting || googleLoading}
            >
              {submitting
                ? "Please wait..."
                : mode === "signin"
                  ? "Log in"
                  : "Create account"}
            </Button>

            {mode === "signin" && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  className="text-sm font-medium text-slate-200 hover:text-white"
                  onClick={() => toast.info("Use Google login if you forgot your password.")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/15" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-slate-400">
                <span className="bg-[#1b1d25] px-3">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-full border-slate-600 bg-transparent text-base text-slate-100 hover:bg-slate-800/60 hover:text-white disabled:opacity-50"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleLoading}
            >
              {googleLoading ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            {hasAccessDeniedError && (
              <div className="rounded-xl border border-rose-300/25 bg-rose-600/10 px-4 py-3 text-sm text-rose-200">
                This account is not allowed. Only shop-owner access is enabled.
              </div>
            )}

            <p className="text-center text-xs text-slate-400">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
