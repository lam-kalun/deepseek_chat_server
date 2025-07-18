import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// import { z } from "zod";

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  'get-coin-list',
  '获取硬币列表',
  {},
  () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          Phoenix: 3,
          Lion: 2,
          Jellyfish: 2,
          Elephant: 1,
        }),
      },
    ],
  })
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error)
  process.exit(1)
});