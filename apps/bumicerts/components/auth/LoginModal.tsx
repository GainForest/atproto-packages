"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { authorize } from "@/components/actions/oauth";
import { buildCentralLoginUrl } from "@/lib/central-auth-client";
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
  const t = useTranslations("modals.auth.login");

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
        {t("tabs.email")}
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
        {t("tabs.handle")}
      </button>
    </div>
  );
}

// ─── Email Form ───────────────────────────────────────────────────────────────

function EmailForm() {
  const t = useTranslations("modals.auth.login");
  const [email, setEmail] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsRedirecting(true);
    setTimeout(() => setIsRedirecting(false), 10_000);
    // Save the current page so we can redirect back after login
    localStorage.setItem(
      "auth_redirect",
      `${window.location.pathname}${window.location.search}`,
    );
    const centralLoginUrl = buildCentralLoginUrl({ email });
    if (centralLoginUrl) {
      window.location.href = centralLoginUrl;
      return;
    }

    const url = email
      ? `/api/oauth/epds/login?email=${encodeURIComponent(email)}`
      : "/api/oauth/epds/login";
    window.location.href = url;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          {t("email.label")}
        </label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("email.placeholder")}
          autoComplete="email"
          autoFocus
          disabled={isRedirecting}
        />
        <p className="text-xs text-muted-foreground">
          {t("email.helper")}
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
            {t("actions.redirecting")}
          </>
        ) : (
          <>
            {t("actions.continue")}
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

type HandleErrorKey =
  | "invalidCharacters"
  | "missingDomain"
  | "emptyLabel"
  | "invalidLabelEdges";

function getHandleErrorKey(handle: string): HandleErrorKey | null {
  const trimmedHandle = handle.trim();

  if (!trimmedHandle) {
    return null;
  }

  if (/[^a-z0-9\-.]/.test(trimmedHandle)) {
    return "invalidCharacters";
  }

  const labels = trimmedHandle.split(".");

  if (labels.length < 2) {
    return "missingDomain";
  }

  if (labels.some((label) => label.length === 0)) {
    return "emptyLabel";
  }

  if (!labels.every(isValidHandleLabel)) {
    return "invalidLabelEdges";
  }

  return null;
}

function HandleForm() {
  const t = useTranslations("modals.auth.login");
  const getValidationMessage = (key: HandleErrorKey) => {
    switch (key) {
      case "invalidCharacters":
        return t("handle.validation.invalidCharacters");
      case "missingDomain":
        return t("handle.validation.missingDomain");
      case "emptyLabel":
        return t("handle.validation.emptyLabel");
      case "invalidLabelEdges":
        return t("handle.validation.invalidLabelEdges");
    }
  };
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedHandle = handle.trim();
  const handleErrorKey = getHandleErrorKey(handle);
  const canSubmit = Boolean(normalizedHandle) && !handleErrorKey;

  const handleSubmit = (e: FormEvent) => {
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
        const centralLoginUrl = buildCentralLoginUrl({ handle: handle.trim() });
        if (centralLoginUrl) {
          window.location.href = centralLoginUrl;
          return;
        }

        const result = await authorize(handle.trim());
        if ("authorizationUrl" in result) {
          window.location.href = result.authorizationUrl;
        } else {
          setError(
            result.errorType === "identity"
              ? t("handle.errors.identity")
              : t("handle.errors.server"),
          );
        }
      } catch {
        setError(t("handle.errors.generic"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-handle" className="text-sm font-medium">
          {t("handle.label")}
        </label>
        <Input
          id="login-handle"
          type="text"
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value.toLowerCase());
            setError(null);
          }}
          placeholder={t("handle.placeholder")}
          autoComplete="username"
          autoFocus
          disabled={isPending}
        />

        <AnimatePresence mode="wait">
          {handleErrorKey ? (
            <motion.p
              key="herr"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-destructive"
            >
              {getValidationMessage(handleErrorKey)}
            </motion.p>
          ) : normalizedHandle ? (
            <motion.p
              key="hpreview"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-muted-foreground"
            >
              {t("handle.signingInAs")}{" "}
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
            {t("actions.redirecting")}
          </>
        ) : (
          <>
            {t("actions.continue")}
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

export function LoginModal() {
  const t = useTranslations("modals.auth.login");
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
          alt={t("logoAlt")}
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
          {t("heading")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("subheading")}
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
