"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { AuthModal } from "@/components/global/modals/auth";

export function SignInPrompt() {
  const { pushModal, show } = useModal();

  const handleSignIn = () => {
    pushModal({
      id: "auth-modal",
      content: <AuthModal />,
    });
    show();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="mx-1 p-3 rounded-lg bg-muted/40 border border-border/50"
    >
      <p className="text-xs text-muted-foreground text-center mb-2">
        Sign in to manage your organization and content.
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors duration-150"
      >
        Sign In
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
