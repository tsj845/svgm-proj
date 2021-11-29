import express from 'express'
import http from 'http'
import path from 'path'
import {dirname} from 'path'
import {fileURLToPath} from 'url'

const server = express()
const HTTPServer = http.Server(server)
const __dirname = dirname(fileURLToPath(import.meta.url))

server.use('/assets', express.static(__dirname + '/../assets/'))
server.use(express.json())

function send(res, file) {
    return res.sendFile(file, {root: path.join(__dirname + '/../views')})
}

server.get('/', (req, res) => {
    send(res, 'main.html')
})

HTTPServer.listen(3000, ()=> {
    console.log("Started HTTP server. Port:", 3000)
})