import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Public read-only tool: lists live/public orchards on Sow2Grow.
 * No authentication — relies on the `orchards` table RLS allowing public
 * SELECT of live rows via the anon key.
 */
export default defineTool({
  name: "list_public_orchards",
  title: "List public orchards",
  description:
    "List public, live orchards on Sow2Grow. Returns handle, title, tagline, and public URL. Use for research or discovery.",
  inputSchema: {
    query: z
      .string()
      .optional()
      .describe("Optional case-insensitive search over orchard title/tagline."),
    limit: z
      .number()
      .int()
      .optional()
      .describe("Maximum rows to return (default 20, max 50)."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async ({ query, limit }) => {
    const url = process.env.SUPABASE_URL;
    const anon =
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return {
        content: [
          { type: "text", text: "MCP server missing Supabase configuration." },
        ],
        isError: true,
      };
    }

    const cap = Math.min(Math.max(limit ?? 20, 1), 50);
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("orchards")
      .select("handle,title,tagline,status")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(cap);

    if (query && query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`title.ilike.${term},tagline.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }

    const rows = (data ?? []).map((r) => ({
      handle: r.handle,
      title: r.title,
      tagline: r.tagline ?? null,
      url: r.handle
        ? `https://sow2growapp.com/orchard/${r.handle}`
        : null,
    }));

    return {
      content: [
        {
          type: "text",
          text:
            rows.length === 0
              ? "No public orchards found."
              : `Found ${rows.length} orchard(s):\n${rows
                  .map(
                    (r) =>
                      `- ${r.title}${r.handle ? ` (@${r.handle})` : ""}${
                        r.tagline ? ` — ${r.tagline}` : ""
                      }`,
                  )
                  .join("\n")}`,
        },
      ],
      structuredContent: { orchards: rows },
    };
  },
});
