import { createAuthClient } from "better-auth/react";

// Shared client every frontend (web, backoffice, ...) uses to reach the
// auth server living in apps/api. Point NEXT_PUBLIC_AUTH_URL at the API origin.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001",
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

export type AuthClient = typeof authClient;
export type SessionData = AuthClient["$Infer"]["Session"];
