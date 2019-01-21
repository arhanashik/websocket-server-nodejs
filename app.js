"use strict"

//const express = require('express')
//const path = require('path')
//const app = express()

process.title = 'node-chat'
const PORT = 1337

var WebSocketServer = require('websocket').server
var http = require('http')

// we will store last 100 messages 
var history = []
// list of connected clients(users)
var clients = []
// somo colors
var colors = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange']
colors.sort(function(a, b) { return Math.random() > 0.5})

function htmlEntities(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const{getHomePage} = require('./routes/index')

var server = http.createServer(function(req, res) {
    console.log(new Date() + ' HTTP server. URL ' + req.url + ' requested')

    if (req.url === '/') {
        getHomePage
    } else if(req.url === '/status') {
        res.writeHead(200, {'Content-Type': 'application/json'})

        var resObj = {
            currentClients: clients.length,
            totalHistory: history.length
        }

        res.end(JSON.stringify(resObj))
    } else {
        res.writeHead(404, {'Content-Type ': 'text/plain'})
        res.end('Sorry, unknow url')
    }
})

//app.set('views', __dirname + '/views')
//app.set('view engine', 'pug')
//app.use(express.static(path.join(__dirname, 'public')))

//const{getHomePage} = require('./routes/index')
//app.get('/', getHomePage)

server.listen(PORT, function() {
    console.log(new Date() + ' Server is listening on port ' + PORT)
})

//create server
var wsServer = new WebSocketServer({
    httpServer: server
})

//websocket server
wsServer.on('request', function(request) {
    console.log(new Date() + ' Connection from origin ' + request.origin)

    var connection = request.accept(null, request.origin)
    var index = clients.push(connection) - 1
    var userName = false
    var userColor = false

    console.log(new Date() + ' Connection accepted')

    if(history.length > 0) {
        connection.sendUTF(
            JSON.stringify({type: 'history', data: history})
        )
    } else {
        var obj = {
            time: new Date(),
            text: htmlEntities('Welcome to node-chat'),
            author: 'node-chat',
            color: 'green'
        }

        history.push(obj)

        connection.sendUTF(
            JSON.stringify({type: 'history', data: history})
        )
    }

    //handle all messages here
    connection.on('message', function(message) {
        console.log(new Date() + ' new message: ' + message)

        if(message.type === 'utf8') {
            //first message should be users name

            if(userName === false) { // new user
                userName = htmlEntities(message.utf8Data)
                userColor = colors.shift()

                connection.sendUTF(JSON.stringify({type: 'color', data: userColor}))

                console.log(new Date() + ' User is known as: ' + userName + ' with ' + userColor + ' color')
            } else { // user message
                console.log(new Date() + ' Received Message from ' + userName + ': ' + message.utf8Data)

                var obj = {
                    time: new Date(),
                    text: htmlEntities(message.utf8Data),
                    author: userName,
                    color: userColor
                }

                history.push(obj)
                history.slice(-100)

                var json = JSON.stringify({type: 'message', data: obj})
                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json)
                }
            }
        }
    })

    connection.on('close', function(connection) {
        if(userName !== false && userColor !== false) {
            console.log(new Date() + ' Peer ' + connection.remoteAddress + ' disconnected')

            //remove the user
            for (var i = 0; i < clients.length; i ++) {
                if (connection.remoteAddress == clients[i].remoteAddress) {
                    clients.splice(i, 1)
                    break
                }
            }
            // push back the color to reuse
            colors.push(userColor)
        }
    })
})