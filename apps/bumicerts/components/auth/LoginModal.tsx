"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { authorize } from "@/components/actions/oauth";
import { clientEnv as env } from "@/lib/env/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

// ─── Pill Toggle ──────────────────────────────────────────────────────────────

function PillToggle({
  active,
  onChange,
}: {
  active: "handle" | "email";
  onChange: (tab: "handle" | "email") => void;
}) {
  return (
    <div className="flex w-full rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("email")}
        className={cn(
          "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          active === "email"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Email
      </button>
      <button
        type="button"
        onClick={() => onChange("handle")}
        className={cn(
          "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          active === "handle"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Handle
      </button>
    </div>
  );
}

// ─── Email Form ───────────────────────────────────────────────────────────────

function EmailForm() {
  const [email, setEmail] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRedirecting(true);
    setTimeout(() => setIsRedirecting(false), 10_000);
    // Save the current page so we can redirect back after login
    localStorage.setItem(
      "auth_redirect",
      `${window.location.pathname}${window.location.search}`,
    );
    const url = email
      ? `/api/oauth/epds/login?email=${encodeURIComponent(email)}`
      : "/api/oauth/epds/login";
    window.location.href = url;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          disabled={isRedirecting}
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll send you a verification code
        </p>
      </div>

      <Button
        type="submit"
        disabled={isRedirecting || !email.trim()}
        className="w-full"
      >
        {isRedirecting ? (
          <>
            <LoaderIcon className="animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            Continue
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Handle Form ──────────────────────────────────────────────────────────────

function isValidHandleLabel(label: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

function getHandleError(handle: string): string | null {
  const trimmedHandle = handle.trim();

  if (!trimmedHandle) {
    return null;
  }

  if (/[^a-z0-9\-.]/.test(trimmedHandle)) {
    return "Only letters, numbers, hyphens, and dots are allowed.";
  }

  const labels = trimmedHandle.split(".");

  if (labels.length < 2) {
    return "Enter your full ATProto handle, including its domain.";
  }

  if (labels.some((label) => label.length === 0)) {
    return "Handle labels cannot be empty.";
  }

  if (!labels.every(isValidHandleLabel)) {
    return "Handle labels must start and end with a letter or number.";
  }

  return null;
}

function HandleForm() {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedHandle = handle.trim();
  const handleError = getHandleError(handle);
  const canSubmit = Boolean(normalizedHandle) && !handleError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    // Save the current page so we can redirect back after login
    localStorage.setItem(
      "auth_redirect",
      `${window.location.pathname}${window.location.search}`,
    );
    startTransition(async () => {
      try {
        const result = await authorize(handle.trim());
        if ("authorizationUrl" in result) {
          window.location.href = result.authorizationUrl;
        } else {
          // Error returned from server action (not thrown)
          setError(result.error);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-handle" className="text-sm font-medium">
          ATProto handle
        </label>
        <Input
          id="login-handle"
          type="text"
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value.toLowerCase());
            setError(null);
          }}
          placeholder="alice.example.com"
          autoComplete="username"
          autoFocus
          disabled={isPending}
        />

        <AnimatePresence mode="wait">
          {handleError ? (
            <motion.p
              key="herr"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-destructive"
            >
              {handleError}
            </motion.p>
          ) : normalizedHandle ? (
            <motion.p
              key="hpreview"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-muted-foreground"
            >
              Signing in as{" "}
              <span className="font-mono text-foreground">
                {normalizedHandle}
              </span>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={!canSubmit || isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <LoaderIcon className="animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            Continue
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

export function LoginModal() {
  const [activeTab, setActiveTab] = useState<"handle" | "email">("email");
  const hasEpds = !!env.NEXT_PUBLIC_EPDS_URL;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full"
    >
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <Image
          src="/assets/media/images/gainforest-logo.svg"
          alt="GainForest"
          width={40}
          height={40}
        />
      </div>

      {/* Headline */}
      <div className="text-center mb-6">
        <h2
          className="text-3xl font-light tracking-[-0.02em] text-foreground mb-2"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Get Started
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign up or Sign in to your account
        </p>
      </div>

      {/* Tab toggle — always show since both methods are available */}
      <div className="mb-6">
        <PillToggle active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Form */}
      <AnimatePresence mode="wait">
        {hasEpds && activeTab === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
          >
            <EmailForm />
          </motion.div>
        ) : (
          <motion.div
            key="handle"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <HandleForm />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
