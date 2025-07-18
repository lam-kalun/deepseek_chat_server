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