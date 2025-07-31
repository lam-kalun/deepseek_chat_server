import { ServerResponse } from "http";
import { MCPClient } from "./units/mcp";

export async function main(queList: string[], ansList: string[]) {
  const client = new MCPClient(queList, ansList)
  let response: string
  try {
    await client.connectToServer()
    response = await client.chatLoop()
  } finally {
    await client.cleanup()
  }
  return response
}

export async function streamMain(queList: string[], ansList: string[], res: ServerResponse) {  
  const client = new MCPClient(queList, ansList)
  try {
    await client.connectToServer()
    // await client.testTool()
    await client.streamChatLoop(res)
  } finally {
    await client.cleanup()
  }
}