import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "@repo/auth";

const PORT = process.env.PORT || 3001;
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

const app = new Elysia()
  .use(
    cors({
      origin: WEB_ORIGIN,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  // better-auth handles everything under /api/auth/*
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .get("/", () => "Hello Elysia")
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
