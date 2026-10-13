import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";

/** Treats `NAME=` (empty, as copied from .env.example) the same as not setting it. */
const blankAsUnset = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" ? undefined : v), schema);

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
  /** ElevenLabs text-to-speech. Without a key, narration is hidden. */
  ELEVENLABS_API_KEY: blankAsUnset(z.string().min(1).optional()),
  /** Default: "George", a calm premade voice. Any voice id from your ElevenLabs voice library works. */
  ELEVENLABS_VOICE_ID: blankAsUnset(z.string().regex(/^[A-Za-z0-9]{10,40}$/).default("JBFqnCBsd6RMkjVDRZzb")),
  /** Flash is the fastest and cheapest model; eleven_multilingual_v2 sounds richer but is slower. */
  ELEVENLABS_MODEL_ID: blankAsUnset(z.string().regex(/^[a-z0-9_]{3,64}$/).default("eleven_flash_v2_5")),
  /** Groq (groq.com) for AI line-by-line code explanations. Without a key, narration uses step notes only. */
  GROQ_API_KEY: blankAsUnset(z.string().min(1).optional()),
  /** Must support strict structured outputs on Groq (gpt-oss-120b, gpt-oss-20b). */
  GROQ_MODEL_ID: blankAsUnset(z.string().regex(/^[\w./-]{3,80}$/).default("openai/gpt-oss-120b")),
  /** Test environments only: multiplies every rate limit (e.g. 100 for end-to-end tests). */
  RATE_LIMIT_MULTIPLIER: z.coerce.number().int().min(1).max(1000).default(1),
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
    narration: boolean;
    explanations: boolean;
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
      narration: Boolean(env.ELEVENLABS_API_KEY),
      explanations: Boolean(env.GROQ_API_KEY),
    },
  };
  return cached;
}

/** Test helper: forget the cached config so a test can change process.env. */
export function resetConfigForTests(): void {
  cached = undefined;
}
