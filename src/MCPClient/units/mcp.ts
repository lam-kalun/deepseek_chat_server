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
    console.log(process);
    
  }


}