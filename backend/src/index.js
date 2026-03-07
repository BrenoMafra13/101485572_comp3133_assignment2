const http = require('http')

const port = process.env.PORT || 5000

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Backend is running' }))
})

server.listen(port, '0.0.0.0')
