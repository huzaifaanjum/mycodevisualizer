"use server";

import { z } from "zod";
import { signIn, signOut } from "@/server/auth";

const ProviderSchema = z.enum(["github", "google"]);

export async function signInWith(provider: string): Promise<void> {
  await signIn(ProviderSchema.parse(provider), { redirectTo: "/" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
