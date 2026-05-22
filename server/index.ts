import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { createRealtimeSession } from "./openai.js";
import type { Direction, LanguageCode } from "../src/types/translation.js";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: process.env.NODE_ENV === "development" ? "*" : [],
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.post("/api/session", async (c) => {
  const body = await c.req.json<{
    direction: Direction;
    partnerLanguage: LanguageCode;
  }>();

  const { direction, partnerLanguage } = body;

  if (!direction || !partnerLanguage) {
    return c.json({ error: "direction and partnerLanguage are required" }, 400);
  }

  try {
    const session = await createRealtimeSession(direction, partnerLanguage);
    return c.json(session);
  } catch (err) {
    console.error("Session creation error:", err);
    return c.json({ error: "Failed to create session" }, 500);
  }
});

app.use("/*", serveStatic({ root: "./dist" }));

app.get("*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT) || 8080;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
});
