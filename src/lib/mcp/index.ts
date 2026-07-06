import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listPublicOrchardsTool from "./tools/list-public-orchards";

export default defineMcp({
  name: "sow2grow-mcp",
  title: "Sow2Grow MCP",
  version: "0.1.0",
  instructions:
    "Sow2Grow public tools. Use `echo` to verify connectivity, and `list_public_orchards` to discover live orchards on the Sow2Grow tribal marketplace.",
  tools: [echoTool, listPublicOrchardsTool],
});
