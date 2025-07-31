import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";

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

server.tool(
  'get-baoz-info-list',
  '获取饱藏信息列表',
  {},
  async () => {
    // todo 为什么process.env.REDB_API_URL不行
    const response = await fetch(`http://127.0.0.1:2025/get-baoz-info-list`)
    const baozInfo = await response.json()
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(baozInfo)
        },
      ],
    }
  }
)

server.tool(
  'get-baoz-details',
  '根据id获取饱藏详情信息',
  // 必须用zod的格式
  {
    id: z.string().describe("饱藏id")
  },
  async ({ id }) => {
    const response = await fetch(`http://127.0.0.1:2025/get-baoz-details?id=${id}`)
    const baozDetail = await response.json()
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(baozDetail),
        },
      ],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error("Fatal error in main():", error)
  process.exit(1)
});