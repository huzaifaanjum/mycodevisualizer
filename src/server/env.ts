import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "must be a mongodb:// or mongodb+srv:// URI").optional(),
  MONGODB_DB: z.string().min(1).default("mycodevisualizer"),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_GITHUB_ID: z.string().min(1).optional(),
  AUTH_GITHUB_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
  EXECUTION_PROVIDER: z.enum(["vercel-sandbox", "local", "fixture"]).optional(),
  VERCEL_SANDBOX_SNAPSHOT_ID: z.string().min(1).optional(),
  TRACER_JAR_PATH: z.string().min(1).default("tracer/build/tracer.jar"),
});

export type Env = z.infer<typeof EnvSchema>;

export interface ServerConfig {
  env: Env;
  executionProvider: NonNullable<Env["EXECUTION_PROVIDER"]>;
  ipHashSalt: string;
  features: {
    database: boolean;
    auth: boolean;
    github: boolean;
    google: boolean;
  };
}

let cached: ServerConfig | undefined;

/** Validated server configuration. Read lazily so `next build` works without secrets. */
export function getConfig(): ServerConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${fields}`);
  }
  const env = parsed.data;
  const github = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  const google = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const database = Boolean(env.MONGODB_URI);
  if (!env.IP_HASH_SALT && env.NODE_ENV === "production") {
    console.warn("IP_HASH_SALT is not set; using a per-instance random salt (rate limits reset on redeploy).");
  }
  cached = {
    env,
    executionProvider: env.EXECUTION_PROVIDER ?? (env.NODE_ENV === "production" ? "vercel-sandbox" : "local"),
    ipHashSalt: env.IP_HASH_SALT ?? randomBytes(32).toString("hex"),
    features: {
      database,
      auth: database && Boolean(env.AUTH_SECRET) && (github || google),
      github,
      google,
    },
  };
  return cached;
}

/** Test helper: forget the cached config so a test can change process.env. */
export function resetConfigForTests(): void {
  cached = undefined;
}
