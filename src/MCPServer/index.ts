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
  () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          软糖: { id: '001' },
          薯片: { id: '002' },
          巧克力: { id: '003' },
          蛋糕王: { id: '004' },
          布丁: { id: '005' },
          '100零食盒子': { id: '006' }
        }),
      },
    ],
  })
)

server.tool(
  'get-baoz-details',
  '根据id获取饱藏详情信息',
  // 必须用zod的格式
  {
    id: z.string().describe("饱藏id")
  },
  // todo 调用接口获取
  ({ id }) => {
    const baozInfoList = new Map([
      ['001', { color: '紫色' }],
      ['002', { color: '黄色' }],
      ['003', { color: '黑色或者白色' }],
      ['004', { color: '白色' }],
      ['005', { color: '黄色' }],
      ['006', { color: '紫色或者橙色' }],
    ])
    const res = baozInfoList.get(id) || {}
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(res),
        },
      ],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error)
  process.exit(1)
});