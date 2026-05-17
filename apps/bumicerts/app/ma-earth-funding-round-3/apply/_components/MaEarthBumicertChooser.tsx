"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CirclePlusIcon,
  Loader2Icon,
  SearchIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react";
import AtprotoSignInButton from "@/components/global/Header/AtprotoSignInButton";
import { useAtprotoStore } from "@/components/stores/atproto";
import {
  BumicertCardSkeleton,
  BumicertCardVisual,
} from "@/components/bumicert/BumicertCard";
import { Button } from "@/components/ui/button";
import { activitiesToBumicertDataArray } from "@/lib/adapters";
import { links } from "@/lib/links";
import { indexerTrpc } from "@/lib/trpc/indexer/client";

function LoadingCards() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <BumicertCardSkeleton key={index} />
      ))}
    </div>
  );
}

function SignInState() {
  return (
    <div className="w-full max-w-3xl rounded-[2rem] bg-muted/45 p-8 text-center shadow-sm">
      <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-sm">
        <ShieldCheckIcon className="size-6" />
      </div>
      <h2 className="font-instrument text-3xl italic tracking-[-0.03em] text-foreground">
        Sign in to choose a Bumicert
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        MaEarth applications should start from an account-owned public Bumicert.
        Sign in first, then choose the project record you want to share.
      </p>
      <div className="mt-6 flex justify-center">
        <AtprotoSignInButton />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="w-full max-w-3xl rounded-[2rem] bg-muted/45 p-8 text-center shadow-sm">
      <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-sm">
        <CirclePlusIcon className="size-6" />
      </div>
      <h2 className="font-instrument text-3xl italic tracking-[-0.03em] text-foreground">
        Create a Bumicert first
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        We could not find a published Bumicert for this account. Create one with
        your project story, evidence, images, and location details before
        continuing to MaEarth.
      </p>
      <Button asChild className="mt-6">
        <Link href={links.bumicert.create}>
          Create your first Bumicert
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function MaEarthBumicertChooser() {
  const auth = useAtprotoStore((state) => state.auth);
  const [searchValue, setSearchValue] = useState("");

  const {
    data: activitiesData,
    error,
    isPending,
  } = indexerTrpc.activities.list.useQuery(
    { did: auth.authenticated ? auth.user.did : "" },
    { enabled: auth.authenticated },
  );

  if (auth.status === "RESUMING") {
    return (
      <div className="flex min-h-80 w-full items-center justify-center rounded-[2rem] bg-muted/35 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2Icon className="size-6 animate-spin text-primary" />
          Preparing your account
        </div>
      </div>
    );
  }

  if (!auth.authenticated) {
    return <SignInState />;
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl rounded-[2rem] bg-muted/45 p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
          <TriangleAlertIcon className="size-6" />
        </div>
        <h2 className="font-instrument text-3xl italic tracking-[-0.03em] text-foreground">
          Couldn’t load your Bumicerts
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {error.message || "Please refresh and try again."}
        </p>
      </div>
    );
  }

  if (isPending || !activitiesData) {
    return <LoadingCards />;
  }

  const bumicerts = Array.isArray(activitiesData)
    ? activitiesToBumicertDataArray(activitiesData)
    : [];

  if (bumicerts.length === 0) {
    return <EmptyState />;
  }

  const normalizedSearchValue = normalizeSearchValue(searchValue);
  const filteredBumicerts = normalizedSearchValue
    ? bumicerts.filter((bumicert) => {
        const searchableText = [
          bumicert.title,
          bumicert.organizationName,
          bumicert.shortDescription,
          ...bumicert.objectives,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLocaleLowerCase();

        return searchableText.includes(normalizedSearchValue);
      })
    : bumicerts;

  return (
    <div className="w-full space-y-4 text-center">
      <div className="mx-auto max-w-5xl rounded-[1.5rem] bg-primary/[0.06] px-4 py-3 shadow-sm shadow-primary/5">
        <p className="text-sm leading-6 text-muted-foreground">
          By choosing a Bumicert, you consent to share your DID and that public
          Bumicert identifier with MaEarth so their importer can retrieve the
          public project record.
        </p>
      </div>

      <label className="relative mx-auto block w-full max-w-xl">
        <span className="sr-only">Search Bumicerts</span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search Bumicerts"
          className="h-12 w-full rounded-full bg-muted/55 pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:bg-background focus:ring-2 focus:ring-primary/25"
        />
      </label>

      {filteredBumicerts.length === 0 ? (
        <div className="mx-auto max-w-2xl rounded-[1.5rem] bg-muted/45 p-6 text-sm leading-7 text-muted-foreground shadow-sm">
          No Bumicerts match your search.
        </div>
      ) : (
        <div className="mx-auto grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {filteredBumicerts.map((bumicert) => (
            <Link
              key={bumicert.id}
              href={links.external.maEarth.importBumicert({
                did: auth.user.did,
                bumicertId: bumicert.id,
              })}
              className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <BumicertCardVisual
                coverImage={bumicert.coverImageUrl}
                logoUrl={bumicert.logoUrl}
                title={bumicert.title}
                organizationName={bumicert.organizationName}
                objectives={bumicert.objectives}
                description={bumicert.shortDescription}
                className="h-full border-0 shadow-sm"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
