import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLinkIcon, HelpCircleIcon, LeafIcon } from "lucide-react";
import AuthWrapper from "./[draftId]/_components/AuthWrapper";
import { CreateBumicertTabs } from "./_components/CreateBumicertTabs";
import GetStartedButton from "./_components/GetStartedButton";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { getTranslations } from "next-intl/server";
import { noIndexMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bumicert.create.landing.hero");
  return {
    ...noIndexMetadata("Create a Bumicert"),
    description: t("description"),
  };
}

type CreatePageTranslations = Awaited<ReturnType<typeof getCreatePageTranslations>>;

const getCreatePageTranslations = async () => {
  const t = await getTranslations("bumicert.create.landing");
  return {
    heroTitleLine1: t("hero.titleLine1"),
    heroTitleLine2: t("hero.titleLine2"),
    heroDescription: t("hero.description"),
    explainerTitle: t("explainer.title"),
    explainerBody1: t("explainer.body1"),
    explainerBody2: t("explainer.body2"),
    learnMore: t("explainer.learnMore"),
  };
};

function CreateHeroCard({ translations }: { translations: CreatePageTranslations }) {
  return (
    <section className="relative overflow-visible rounded-[1.6rem] border border-border/80 bg-card shadow-sm">
      <div className="relative min-h-[17.5rem] overflow-hidden rounded-[1.55rem]">
        <Image
          src="/assets/media/images/create-bumicert/hero-light.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 720px, 100vw"
          className="object-cover object-center dark:hidden"
        />
        <Image
          src="/assets/media/images/create-bumicert/hero-dark.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 720px, 100vw"
          className="hidden object-cover object-center dark:block"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/72 to-background/5 dark:from-background/90 dark:via-background/58 dark:to-background/10" />
        <div className="absolute -top-8 right-[7%] h-28 w-52 rounded-full bg-background/50 blur-2xl dark:bg-primary/10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-foreground/20 via-foreground/5 to-transparent dark:from-black/55" />

        <div className="relative z-10 flex min-h-[17.5rem] max-w-[29rem] flex-col justify-center px-6 py-8 sm:px-8 lg:px-9">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-primary shadow-sm backdrop-blur-sm">
            <LeafIcon className="size-6" />
          </div>
          <h1 className="font-serif text-4xl font-medium leading-[0.98] tracking-[-0.03em] text-foreground sm:text-5xl">
            {translations.heroTitleLine1}
            <br />
            {translations.heroTitleLine2}
          </h1>
          <p className="mt-5 max-w-[25rem] text-base leading-7 text-muted-foreground">
            {translations.heroDescription}
          </p>
          <div className="mt-7">
            <GetStartedButton />
          </div>
        </div>
      </div>
      <Image
        src="/assets/media/images/create-bumicert/plant-light.png"
        alt=""
        width={1002}
        height={1146}
        priority
        className="pointer-events-none absolute bottom-0 right-[4%] z-20 hidden h-[28rem] w-auto max-w-[58%] object-contain dark:hidden md:block"
      />
      <Image
        src="/assets/media/images/create-bumicert/plant-dark.png"
        alt=""
        width={964}
        height={1129}
        priority
        className="pointer-events-none absolute bottom-0 right-[4%] z-20 hidden h-[28rem] w-auto max-w-[58%] object-contain dark:md:block"
      />
    </section>
  );
}

function ExplainerCard({ translations }: { translations: CreatePageTranslations }) {
  return (
    <aside className="rounded-[1.6rem] border border-border/80 bg-card/75 p-7 shadow-sm backdrop-blur-sm lg:min-h-[17.5rem]">
      <div className="mb-8 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <HelpCircleIcon className="size-5" />
      </div>
      <h2 className="font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-foreground">
        {translations.explainerTitle}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground">
        <p>
          {translations.explainerBody1}
        </p>
        <p>
          {translations.explainerBody2}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild className="mt-5">
        <Link href={links.external.docs} target="_blank" rel="noreferrer">
          {translations.learnMore}
          <ExternalLinkIcon />
        </Link>
      </Button>
    </aside>
  );
}

const CreateBumicertPage = async () => {
  const translations = await getCreatePageTranslations();

  return (
    <AuthWrapper className="max-w-[1440px] px-4 py-8 sm:px-6">
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
          <CreateHeroCard translations={translations} />
          <ExplainerCard translations={translations} />
        </div>
        <CreateBumicertTabs />
      </div>
    </AuthWrapper>
  );
};

export default CreateBumicertPage;
