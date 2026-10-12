import "server-only";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getMongoClient } from "@/server/db/client";
import { getConfig } from "@/server/env";

/**
 * Auth is optional: every core feature works signed out. Sign-in exists to keep a history of saved
 * snippets. Only OAuth providers are used, so no passwords are ever stored.
 */
function buildConfig(): NextAuthConfig {
  const { env, features } = getConfig();
  return {
    secret: env.AUTH_SECRET,
    trustHost: true,
    adapter: features.auth ? MongoDBAdapter(() => getMongoClient(), { databaseName: env.MONGODB_DB }) : undefined,
    session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
    providers: [
      ...(features.github ? [GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET })] : []),
      ...(features.google ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })] : []),
    ],
    callbacks: {
      session({ session, user }) {
        if (session.user && user) session.user.id = user.id;
        return session;
      },
    },
    pages: { signIn: "/" },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => buildConfig());

export interface SessionUser {
  id: string;
  name: string | null;
  image: string | null;
}

/** The signed-in user, or null when signed out or when auth is not configured. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!getConfig().features.auth) return null;
  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return null;
    return { id: user.id, name: user.name ?? null, image: user.image ?? null };
  } catch (err) {
    console.error("Could not read session", err);
    return null;
  }
}
