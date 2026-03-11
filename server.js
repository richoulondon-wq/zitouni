const express = require("express")
const path = require("path")
const app = express()

const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static(path.join(__dirname,"public")))

let queue = []

io.on("connection",(socket)=>{

socket.emit("status","Connected")

/* FIND PARTNER */

socket.on("find",()=>{

queue = queue.filter(s=>s!==socket)

if(queue.length > 0){

const partner = queue.shift()

socket.partner = partner
partner.partner = socket

socket.emit("matched")
partner.emit("matched")

socket.emit("status","Connected")
partner.emit("status","Connected")

}else{

queue.push(socket)
socket.emit("status","Searching for partner...")

}

})

/* NEXT USER */

socket.on("next",()=>{

if(socket.partner){

const partner = socket.partner

partner.emit("partner-left")
partner.partner = null

socket.partner = null

}

})

/* SIGNALING */

socket.on("offer",(data)=>{
if(socket.partner) socket.partner.emit("offer",data)
})

socket.on("answer",(data)=>{
if(socket.partner) socket.partner.emit("answer",data)
})

socket.on("ice",(data)=>{
if(socket.partner) socket.partner.emit("ice",data)
})

/* CHAT */

socket.on("message",(msg)=>{
if(socket.partner) socket.partner.emit("message",msg)
})

/* DISCONNECT */

socket.on("disconnect",()=>{

queue = queue.filter(s=>s!==socket)

if(socket.partner){

socket.partner.emit("partner-left")
socket.partner.partner = null

}

})

})

const PORT = process.env.PORT || 10000

http.listen(PORT,()=>{

console.log("Server running on port "+PORT)

})