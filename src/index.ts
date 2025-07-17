import { createServer } from 'http'
import type { IncomingMessage } from 'http'
import axios from 'axios'
import 'dotenv/config'
import { main } from './MCPClient'

const api = axios.create({
  baseURL: 'https://api.deepseek.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DeepSeek_API_Key}`
  }
})

createServer(async (req, res) => {
  // 跨域问题
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  const url = new URL(req.url!, 'file:///')
  const query = Object.fromEntries(url.searchParams.entries())
  const body = await getRequestBody(req)
  switch(url.pathname) {
    case '/chat':
      res.setHeader('Content-Type', 'text/event-stream')
      if (!query.prompt) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: "请输入提问内容" })}\n\n`);
        res.end();
        break
      }
      const { data } = await api.post('chat/completions', {
        "model": "deepseek-chat",
        "messages": [
          {"role": "user", "content": query.prompt}
        ],
        "stream": true
      }, {
        responseType: 'stream'
      })
      data.pipe(res)
      break
    case '/multiple-chat': {
      res.setHeader('Content-Type', 'text/event-stream')
      if (!body) {
        res.end();
        break
      }
      const { queList, ansList } = JSON.parse(body)
      const messages = queList.reduce((acc: object[], cur: string, index: number) => {
        const list = [{"role": "user", "content": cur}]
        if (ansList[index]) {
          list.push({"role": "assistant", "content": ansList[index]})
        }
        return acc.concat(list)
      }, [])
      const { data } = await api.post('chat/completions', {
        "model": "deepseek-chat",
        "messages": messages,
        "stream": true
      }, {
        responseType: 'stream'
      })
      data.pipe(res)
      break
    }
    case '/mcp-chat': {
      main()
      break
    }
    default:
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: "404" })}\n\n`);
      res.end('')
      break
  }
}).listen(6060)

function getRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      resolve(body)
    })
    req.on('error', (err) => {
      reject(err)
    })
  })
}
