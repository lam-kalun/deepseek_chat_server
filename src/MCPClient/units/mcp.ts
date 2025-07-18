import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import OpenAi from 'openai';
import { ChatCompletion, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index";
export class MCPClient {
  private mcp: Client
  private transport: StdioClientTransport | null = null
  private tools: ChatCompletionTool[] = []
  private messages: ChatCompletionMessageParam[] = []
  private openai: OpenAi

  constructor(queList: string[], ansList: string[]) {
    this.mcp = new Client({
      name: 'my-mcp-client',
      version: '1.0.0',
    })
    this.openai = new OpenAi({baseURL: 'https://api.deepseek.com', apiKey: process.env.DeepSeek_API_Key})
    this.messages = queList.reduce((acc: ChatCompletionMessageParam[], cur: string, index: number) => {
      const list: ChatCompletionMessageParam[] = [{"role": "user", "content": cur}]
      if (ansList[index]) {
        list.push({"role": "assistant", "content": ansList[index]})
      }
      return acc.concat(list)
    }, [])
  }

  async connectToServer() {
    try {
      this.transport = new StdioClientTransport({
        command: 'tsx',
        args: ['./src/MCPServer/dist/index.js']
      })
      await this.mcp.connect(this.transport)
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          }
        };
      });
    } catch(e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery() {
    const completion: ChatCompletion = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: this.messages,
      tools: this.tools
    })
    const content = completion.choices[0]
    if (content.finish_reason === 'tool_calls') {
      this.messages.push(content.message)
      for (const toolCall of content.message.tool_calls!) {
        const toolName = toolCall.function.name
        const toolArgs = JSON.parse(toolCall.function.arguments)
        const result = await this.mcp.callTool({ name: toolName, arguments: toolArgs })
        this.messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
        })
      }
    }
    return completion
  }

  async chatLoop() {
    while (true) {
      const completion = await this.processQuery()
      const content = completion.choices[0]
      if (content.finish_reason === 'stop') {
        return content.message.content || ''
      }
    }
  }

  async cleanup() {
    await this.mcp.close();
  }

}