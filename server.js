const express = require("express")
const path = require("path")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static(path.join(__dirname,"public")))

let queue = []
let onlineUsers = 0

io.on("connection", (socket) => {

  onlineUsers++
  io.emit("online", onlineUsers)

  socket.emit("status","Connected")

  socket.on("find", (data) => {

    socket.username = data?.username || "Anonymous"
    socket.country = data?.country || ""
    socket.gender = data?.gender || ""

    queue = queue.filter(s => s !== socket)

    let partnerIndex = queue.findIndex(u => {
      return (!socket.country || !u.country || u.country === socket.country) &&
             (!socket.gender || !u.gender || u.gender === socket.gender)
    })

    if (partnerIndex !== -1) {
      const partner = queue.splice(partnerIndex, 1)[0]
      socket.partner = partner
      partner.partner = socket

      // إرسال اسم الشريك عند المطابقة
      socket.emit("matched", { username: partner.username })
      partner.emit("matched", { username: socket.username })

      socket.emit("status","Connected")
      partner.emit("status","Connected")
    } else {
      queue.push(socket)
      socket.emit("status","Searching for partner...")
    }
  })

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partner-left")
      socket.partner.partner = null
      socket.partner = null
    }
  })

  socket.on("offer", data => { if(socket.partner) socket.partner.emit("offer", data) })
  socket.on("answer", data => { if(socket.partner) socket.partner.emit("answer", data) })
  socket.on("ice", data => { if(socket.partner) socket.partner.emit("ice", data) })
  socket.on("message", msg => { if(socket.partner) socket.partner.emit("message", msg) })

  socket.on("disconnect", () => {
    onlineUsers--
    io.emit("online", onlineUsers)

    queue = queue.filter(s => s !== socket)
    if (socket.partner) {
      socket.partner.emit("partner-left")
      socket.partner.partner = null
    }
  })

})

const PORT = process.env.PORT || 10000
http.listen(PORT, () => console.log("Server running on " + PORT))