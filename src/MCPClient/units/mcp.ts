import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { ServerResponse } from "http";
import OpenAi from 'openai';
import { Stream } from "openai/core/streaming";
import { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index";
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
    }, [{"role": "system", "content": "回答不要有**"}])
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

  // 一共一个role: assistant的message，和n个role: tool的message，n为role: assistant的message里属性tool_calls的长度
  async processQuery() {
    const completion: ChatCompletion = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: this.messages,
      tools: this.tools,
    })
    const choice = completion.choices[0]
    if (choice.finish_reason === 'tool_calls') {
      this.messages.push(choice.message)
      for (const toolCall of choice.message.tool_calls!) {
        if (!toolCall) continue
        try {
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments)
          // 执行tools里的方法
          const result = await this.mcp.callTool({ name: toolName, arguments: toolArgs })
          this.messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          })
        } catch (error) {
          let errMsg
          if (error instanceof Error) {
            errMsg = error.message;
          } else {
            // 处理非Error类型异常
            errMsg = String(error)
          }
          // 添加错误信息到消息历史
          this.messages.push({
            role: 'tool',
            content: `Tool call failed: ${errMsg}`,
            tool_call_id: toolCall.id
          })
        }
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

  async executeToolCalls(toolCalls: any[]) {
    for (const toolCall of toolCalls) {
      if (!toolCall) continue
      try {
        const toolName = toolCall.function.name
        const toolArgs = JSON.parse(toolCall.function.arguments)
        // 执行tools里的方法
        const result = await this.mcp.callTool({ name: toolName, arguments: toolArgs })
        this.messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        })
      } catch (error) {
        let errMsg
          if (error instanceof Error) {
            errMsg = error.message;
          } else {
            // 处理非Error类型异常
            errMsg = String(error)
          }
        // 添加错误信息到消息历史
        this.messages.push({
          role: 'tool',
          content: `Tool call failed: ${errMsg}`,
          tool_call_id: toolCall.id
        })
      }
    }
  }

  async streamProcessQuery(res: ServerResponse) {
    const completion: Stream<ChatCompletionChunk> = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: this.messages,
      tools: this.tools,
      stream: true,
    })
    // todo 找出这个东西的类型，不行就自己写
    const toolCalls: any[]= []
    let collectContent: string = ''
    for await (const chunk of completion) {
      const choice = chunk.choices[0]
      if (Object.prototype.hasOwnProperty.call(choice.delta, 'tool_calls')) {
        for (const toolCall of choice.delta.tool_calls!) {
          const idx = toolCall.index
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: '',
              type: 'function',
              function: {
                name: '',
                arguments: ''
              }
            }
          }
          if (toolCall.id) {
            toolCalls[idx].id = toolCall.id
          }
          if (toolCall.function?.name) {
            toolCalls[idx].function.name += toolCall.function.name
          }
          if (toolCall.function?.arguments) {
            toolCalls[idx].function.arguments += toolCall.function.arguments
          }
        }
      }

      if (Object.prototype.hasOwnProperty.call(choice.delta, 'content')) {
        res.write(`data: ${JSON.stringify({content: choice.delta.content})}\n\n`)
        collectContent += choice.delta.content
      }

      if (choice.finish_reason === 'tool_calls') {
        this.messages.push({
          role: 'assistant',
          content: collectContent,
          tool_calls: toolCalls.filter(Boolean)
        })
        await this.executeToolCalls(toolCalls)
        return false
      }

      if (choice.finish_reason === 'stop') {
        return true
      }
    }
  }

  async streamChatLoop(res: ServerResponse) {
    // 客户端使用fetchEventSource，服务端要使用SSE格式
    // 所有消息必须包装在 data: 前缀中
    // 每条消息以两个换行符 \n\n 结束
    // !todo 并发时会多一条只有first的请求
    // 后续没复现了
    res.write(`data: ${JSON.stringify({message: 'first'})}\n\n`)
    while (true) {
      const isStop = await this.streamProcessQuery(res)    
      if (isStop) {
        res.end('data: [DONE]\n\n')
        return
      }
    }
  }

  async cleanup() {
    await this.mcp.close();
  }

  // 调试用
  async testTool() {
    try {
      const result = await this.mcp.callTool({ name: 'get-baoz-info-list', arguments: {} });
      console.log("调用成功:", JSON.stringify(result));
    } catch (error) {
      console.error("调用失败:", error);
    }
  }

}