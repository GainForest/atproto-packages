import { Resend } from "resend";
import { env } from "@/lib/env";

export const resend = new Resend(env.RESEND_API_KEY);

export const getInviteEmailConfig = () => {
  const from = "noreply@gainforest.id";
  const subject = "Your Bumicerts Invite Code";

  return { from, subject };
};
