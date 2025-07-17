import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { Tool } from "@modelcontextprotocol/sdk/types"

export class MCPClient {
  private mcp: Client
  private transport: StdioClientTransport | null = null
  private tools: Tool[] = []

  constructor() {
    this.mcp = new Client({
      name: 'my-mcp-client',
      version: '1.0.0',
    })
  }

  async connectToServer() {
    try {
      this.transport = new StdioClientTransport({
        command: 'tsx',
        args: ['../../MCPServer/dist/index.js']
      })
      await this.mcp.connect(this.transport)
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        };
      });
    console.log(
      "Connected to server with tools:",
      this.tools.map(({ name }) => name)
    );
    } catch(e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery() {
    
  }

}