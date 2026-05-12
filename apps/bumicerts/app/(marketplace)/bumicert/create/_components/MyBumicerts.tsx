"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CirclePlusIcon, LeafIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import {
  BumicertCardSkeleton,
  BumicertCardVisual,
} from "@/components/bumicert/BumicertCard";
import { activitiesToBumicertDataArray } from "@/lib/adapters";
import { links } from "@/lib/links";
import { indexerTrpc } from "@/lib/trpc/indexer/client";

const MyBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: activitiesData,
    error,
    isPending,
  } = indexerTrpc.activities.list.useQuery(
    { did: auth.authenticated ? auth.user.did : "" },
    { enabled: auth.authenticated },
  );

  const bumicerts = (() => {
    if (!auth.authenticated) return undefined;
    if (!activitiesData) return undefined;
    if (!Array.isArray(activitiesData)) return [];

    return activitiesToBumicertDataArray(activitiesData);
  })();

  return (
    <div className="pt-6">
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-[2rem] bg-muted/30 px-6 text-center"
        >
          <TriangleAlertIcon className="size-8 text-muted-foreground opacity-60" />
          <div className="space-y-1">
            <p className="font-serif text-2xl font-medium text-foreground">
              Couldn&apos;t load Bumicerts
            </p>
            <p className="text-sm text-muted-foreground">
              {error.message || "Please try again in a moment."}
            </p>
          </div>
        </motion.div>
      ) : isPending || bumicerts === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <BumicertCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {bumicerts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex min-h-[18rem] flex-col items-center justify-center px-6 text-center"
            >
              <div className="relative mb-4 flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                <div className="absolute -bottom-5 left-1/2 h-16 w-28 -translate-x-1/2 rounded-[50%] bg-primary/15" />
                <div className="absolute -bottom-7 left-[42%] h-14 w-24 -translate-x-1/2 rounded-[50%] bg-primary/10" />
                <LeafIcon className="relative z-10 size-9" />
              </div>
              <div className="space-y-2">
                <p className="font-serif text-2xl font-medium leading-tight tracking-[-0.02em] text-foreground">
                  No recent Bumicerts yet
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  You haven&apos;t created any Bumicerts yet.
                  <br />
                  Create your first Bumicert to get started.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="mt-5">
                <Link href={links.bumicert.createWithDraftId("0")}>
                  <CirclePlusIcon />
                  Create your first Bumicert
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div key="grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bumicerts.map((bumicert) => (
                <motion.div
                  key={bumicert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Link
                    href={links.bumicert.view(bumicert.id)}
                    className="block h-full"
                  >
                    <BumicertCardVisual
                      coverImage={bumicert.coverImageUrl}
                      logoUrl={bumicert.logoUrl}
                      title={bumicert.title}
                      organizationName={bumicert.organizationName}
                      objectives={bumicert.objectives}
                      description={bumicert.shortDescription}
                      className="h-full"
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default MyBumicerts;
