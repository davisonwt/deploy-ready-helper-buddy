import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listPublicOrchardsTool from "./tools/list-public-orchards";

// The OAuth issuer MUST be the direct Supabase host, built from the project ref
// (never SUPABASE_URL, which is the .lovable.cloud proxy on Lovable Cloud).
// VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite, so this stays
// import-safe (no runtime env read). The fallback keeps the issuer well-formed
// during the manifest-extract eval, where tokens are never verified.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sow2grow-mcp",
  title: "Sow2Grow MCP",
  version: "0.1.0",
  instructions:
    "Sow2Grow tools. Use `echo` to verify connectivity, and `list_public_orchards` to discover live orchards on the Sow2Grow tribal marketplace. Callers must sign in as a Sow2Grow user via OAuth.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listPublicOrchardsTool],
});
