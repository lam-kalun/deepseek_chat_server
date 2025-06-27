import { createServer } from 'http'
import axios from 'axios'
import 'dotenv/config'
import { createReadStream } from 'fs'

const api = axios.create({
  baseURL: 'https://api.deepseek.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DeepSeek_API_Key}`
  }
})

createServer(async (req, res) => {
  const url = new URL(req.url!, 'file:///')
  const query = Object.fromEntries(url.searchParams.entries())
  switch(url.pathname) {
    case '/':
      createReadStream('./index.html').pipe(res)
      break
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
    default:
      res.end('')
      break
  }
}).listen(9000)
