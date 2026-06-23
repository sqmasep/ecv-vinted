import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/db";

// Origins of every frontend that talks to this auth server.
// Override via AUTH_TRUSTED_ORIGINS (comma-separated) in production.
const trustedOrigins = (
  process.env.AUTH_TRUSTED_ORIGINS ??
  "http://localhost:3000,http://localhost:3002"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      // Domain role (buyer | seller | expert | admin). input:false so a
      // client cannot escalate its own role at sign-up; set it server-side.
      role: {
        type: "string",
        required: false,
        defaultValue: "buyer",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },
  trustedOrigins,
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
