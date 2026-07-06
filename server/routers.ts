import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ─── Agent API Proxy Router ───────────────────────────────────────────────────
// All external API calls that are CORS-blocked in the browser are proxied here.
// The frontend calls /api/trpc/agents.* and this server makes the real HTTP call.

const agentsRouter = router({

  // ── Pushover: Send real push notification ──────────────────────────────────
  sendPushoverNotification: publicProcedure
    .input(z.object({
      userKey: z.string().min(1),
      token: z.string().min(1),
      title: z.string().optional(),
      message: z.string().min(1),
      sound: z.string().optional().default("cashregister"),
      url: z.string().optional(),
      priority: z.number().optional().default(0),
    }))
    .mutation(async ({ input }) => {
      const start = Date.now();
      try {
        const body = new URLSearchParams({
          token: input.token,
          user: input.userKey,
          title: input.title ?? "7-Agent Price Intelligence",
          message: input.message,
          sound: input.sound ?? "cashregister",
          priority: String(input.priority ?? 0),
        });
        if (input.url) body.set("url", input.url);

        const res = await fetch("https://api.pushover.net/1/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        const data = await res.json() as Record<string, unknown>;
        const latency = Date.now() - start;

        if (res.ok && data.status === 1) {
          return {
            success: true,
            latency,
            message: "Notification delivered successfully!",
            receipt: data.receipt as string | undefined,
            request: data.request as string | undefined,
          };
        } else {
          return {
            success: false,
            latency,
            message: (data.errors as string[] | undefined)?.join(", ") ?? "Pushover returned an error",
            errors: data.errors as string[] | undefined,
          };
        }
      } catch (err) {
        return {
          success: false,
          latency: Date.now() - start,
          message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }),

  // ── Anthropic: Verify API key with a minimal message ──────────────────────
  verifyAnthropic: publicProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const start = Date.now();
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": input.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 10,
            messages: [{ role: "user", content: "Reply with: OK" }],
          }),
        });

        const data = await res.json() as Record<string, unknown>;
        const latency = Date.now() - start;

        if (res.ok) {
          const content = (data.content as Array<{ type: string; text: string }> | undefined)?.[0];
          const model = data.model as string | undefined;
          return {
            success: true,
            latency,
            message: `API key valid — model: ${model ?? "claude-haiku-4-5"}, reply: "${content?.text ?? "OK"}"`,
            model,
          };
        } else {
          const errMsg = (data.error as Record<string, string> | undefined)?.message ?? "Invalid API key";
          return { success: false, latency, message: errMsg };
        }
      } catch (err) {
        return {
          success: false,
          latency: Date.now() - start,
          message: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }),

  // ── OpenAI: Verify API key by listing models ───────────────────────────────
  verifyOpenAI: publicProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const start = Date.now();
      try {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${input.apiKey}` },
        });
        const data = await res.json() as Record<string, unknown>;
        const latency = Date.now() - start;

        if (res.ok) {
          const models = (data.data as Array<{ id: string }> | undefined)
            ?.slice(0, 5)
            .map(m => m.id) ?? [];
          return {
            success: true,
            latency,
            message: `API key valid — available models include: ${models.join(", ")}`,
            models,
          };
        } else {
          const errMsg = (data.error as Record<string, string> | undefined)?.message ?? "Invalid API key";
          return { success: false, latency, message: errMsg };
        }
      } catch (err) {
        return {
          success: false,
          latency: Date.now() - start,
          message: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }),

  // ── DeepSeek: Verify API key ───────────────────────────────────────────────
  verifyDeepSeek: publicProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const start = Date.now();
      try {
        const res = await fetch("https://api.deepseek.com/models", {
          headers: { Authorization: `Bearer ${input.apiKey}` },
        });
        const data = await res.json() as Record<string, unknown>;
        const latency = Date.now() - start;

        if (res.ok) {
          const models = (data.data as Array<{ id: string }> | undefined)
            ?.map(m => m.id) ?? [];
          return {
            success: true,
            latency,
            message: `API key valid — models: ${models.join(", ")}`,
            models,
          };
        } else {
          const errMsg = (data.error as Record<string, string> | undefined)?.message ?? "Invalid API key";
          return { success: false, latency, message: errMsg };
        }
      } catch (err) {
        return {
          success: false,
          latency: Date.now() - start,
          message: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }),

  // ── HuggingFace: Verify token via whoami ───────────────────────────────────
  verifyHuggingFace: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const start = Date.now();
      try {
        const res = await fetch("https://huggingface.co/api/whoami-v2", {
          headers: { Authorization: `Bearer ${input.token}` },
        });
        const data = await res.json() as Record<string, unknown>;
        const latency = Date.now() - start;

        if (res.ok) {
          return {
            success: true,
            latency,
            message: `Token valid — username: ${data.name ?? "unknown"}, type: ${data.type ?? "user"}`,
            username: data.name as string | undefined,
            type: data.type as string | undefined,
          };
        } else {
          return { success: false, latency, message: "Invalid HuggingFace token" };
        }
      } catch (err) {
        return {
          success: false,
          latency: Date.now() - start,
          message: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;
