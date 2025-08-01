import { createServer } from 'http'
import type { IncomingMessage } from 'http'
import axios from 'axios'
import 'dotenv/config'
import { main, streamMain } from './MCPClient'

const api = axios.create({
  baseURL: 'https://api.deepseek.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DeepSeek_API_Key}`
  }
})

// 嫡长口
createServer(async (req, res) => {
  // 跨域问题
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  const url = new URL(req.url!, 'file:///')
  const query = Object.fromEntries(url.searchParams.entries())
  const body = await getRequestBody(req)
  const { queList = [], ansList = [] } = JSON.parse(body || '{}')
  // !todo axios会多请求一个OPTIONS
  // 任一条件满足
  // 使用了 PUT、DELETE、CONNECT、OPTIONS、TRACE、PATCH 方法。
  // 设置了 自定义请求头（如 Authorization、X-Custom-Header）。
  // Content-Type 不是以下三种之一：
  // application/x-www-form-urlencoded、multipart/form-data、text/plain。

  // todo 将请求头改为application/x-www-form-urlencoded
  if (req.method === 'OPTIONS') {
    res.end('')
    return
  }
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
      const response = await main(queList, ansList)
      res.end(JSON.stringify(response))
      break
    }
    case '/stream-mcp-chat': {
      res.setHeader('Content-Type', 'text/event-stream')
      // !todo 弄清楚下面这东西（划掉）能不能用stream返回（可能是SSE格式问题）
      // 是SSE格式问题
      // res.write('data: 我\n\n')
      // res.write('data: 是\n\n')
      // res.write('data: 一\n\n')
      // res.write('data: 个\n\n')
      // res.write('data: A\n\n')
      // res.write('data: I\n\n')
      // res.end('data: [DONE]\n\n')

      // todo 弄清楚必须要使用await得原因
      await streamMain(queList, ansList, res)
      break
    }
    default:
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: "404" })}\n\n`);
      res.end('')
      break
  }
}).listen(3000)

// 蒙面超人红腹口
createServer(async (req, res) => {
  const url = new URL(req.url!, 'file:///')
  const query = Object.fromEntries(url.searchParams.entries())
  switch(url.pathname) {
    case '/get-baoz-info-list':
      const info = {
        软糖: { id: '001' },
        薯片: { id: '002' },
        巧克力: { id: '003' },
        蛋糕王: { id: '004' },
        布丁: { id: '005' },
        '100零食盒子': { id: '006' }
      }
      res.end(JSON.stringify(info))
      break
    case '/get-baoz-details':
      if (!query.id) {
        res.write(`event: error\n`)
        res.write(`data: ${JSON.stringify({ error: "404" })}\n\n`)
        res.end('')
        return
      }
      const baozInfoMap = new Map([
        ['001', { color: '紫色' }],
        ['002', { color: '黄色' }],
        ['003', { color: '黑色或者白色' }],
        ['004', { color: '白色' }],
        ['005', { color: '黄色' }],
        ['006', { color: '紫色或者橙色' }],
      ])
      const baozDetail = baozInfoMap.get(query.id) || {}
      res.end(JSON.stringify(baozDetail))
      break
    default:
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ error: "404" })}\n\n`)
      res.end('')
      break
  }
}).listen(2025)

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
