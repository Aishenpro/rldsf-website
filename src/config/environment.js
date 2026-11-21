const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  BASE_URL: z.string().url(),

  DATABASE_PATH: z.string().default("./data/foundation.sqlite"),

  JWT_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),

  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),

  FLW_PUBLIC_KEY: z.string().optional(),
  FLW_SECRET_KEY: z.string().optional(),
  FLW_SECRET_HASH: z.string().optional(),

  DEFAULT_CURRENCY: z.string().length(3).default("UGX"),

  MIN_DONATION: z.coerce.number().positive().default(1),
  MAX_DONATION: z.coerce.number().positive().default(1000000000000000000000000)
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = Object.freeze(result.data);