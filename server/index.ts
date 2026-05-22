import { createServer } from "node:http";
import { Hono } from "hono";
import { serve, getRequestListener } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createTranslationSession } from "./openai.js";

const app = new Hono();

app.post("/api/session", async (c) => {
  const body = await c.req.json<{ direction?: string; partnerLanguage?: string }>();
  const { direction, partnerLanguage } = body;

  if (!direction || !partnerLanguage) {
    return c.json({ error: "direction and partnerLanguage are required" }, 400);
  }
  if (direction !== "me_to_partner" && direction !== "partner_to_me") {
    return c.json({ error: "invalid direction" }, 400);
  }

  try {
    const session = await createTranslationSession(
      direction as "me_to_partner" | "partner_to_me",
      partnerLanguage
    );
    return c.json(session);
  } catch (err) {
    console.error("[session]", err);
    return c.json({ error: "failed to create session" }, 500);
  }
});

const port = parseInt(process.env.PORT ?? "8080", 10);

if (process.env.NODE_ENV !== "production") {
  // Development: Vite dev server as middleware for non-API routes
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  const handleApi = getRequestListener(app.fetch);

  const server = createServer((req, res) => {
    if (req.url?.startsWith("/api")) {
      handleApi(req, res).catch((err: unknown) => {
        console.error(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    } else {
      vite.middlewares(req, res, () => {
        res.statusCode = 404;
        res.end("Not Found");
      });
    }
  });

  server.listen(port, () => {
    console.log(`[dev] http://localhost:${port}`);
  });
} else {
  // Production: serve built frontend static files
  app.use("*", serveStatic({ root: "./dist" }));

  serve({ fetch: app.fetch, port }, () => {
    console.log(`http://localhost:${port}`);
  });
}
