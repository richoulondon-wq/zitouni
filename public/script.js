const socket = io()

let peer = null
let localStream = null
let username = ""
let country = ""
let gender = ""

const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo")
const status = document.getElementById("status")

async function startCamera(){
  try{
    localStream = await navigator.mediaDevices.getUserMedia({
      video:{width:640,height:480,frameRate:24},
      audio:true
    })
    localVideo.srcObject = localStream
  }catch(e){
    alert("Camera or microphone permission denied")
  }
}

function joinChat(){
  username = document.getElementById("username").value
  country = document.getElementById("country").value
  gender = document.getElementById("gender").value

  if(!username) return alert("Please enter your name")

  document.getElementById("login").style.display="none"
  document.getElementById("app").style.display="block"

  document.getElementById("localName").innerText = username
  startCamera()
  findUser()
}

function createPeer(){
  peer = new RTCPeerConnection({
    iceServers:[
      {urls:"stun:stun.l.google.com:19302"},
      {urls:"turn:openrelay.metered.ca:80", username:"openrelayproject", credential:"openrelayproject"},
      {urls:"turn:openrelay.metered.ca:443", username:"openrelayproject", credential:"openrelayproject"}
    ]
  })

  localStream.getTracks().forEach(track => peer.addTrack(track, localStream))

  peer.ontrack = (event)=>{ remoteVideo.srcObject = event.streams[0] }
  peer.onicecandidate = e => { if(e.candidate) socket.emit("ice", e.candidate) }
  peer.onconnectionstatechange = ()=> {
    if(peer.connectionState==="connected") status.innerText="Connected"
    if(peer.connectionState==="failed"){ status.innerText="Connection failed"; nextUser() }
  }
}

function findUser(){
  socket.emit("find",{username,country,gender})
}

function nextUser(){
  if(peer){ peer.close(); peer=null }
  remoteVideo.srcObject=null
  document.getElementById("remoteName").innerText = "Stranger"
  socket.emit("next")
  setTimeout(()=>{ findUser() },500)
}

socket.on("status", msg => status.innerText = msg)
socket.on("online", count => document.getElementById("online").innerText = "Online users: "+count)

socket.on("matched", async (data) => {
  createPeer()
  document.getElementById("remoteName").innerText = data.username || "Stranger"
  const offer = await peer.createOffer()
  await peer.setLocalDescription(offer)
  socket.emit("offer", offer)
})

socket.on("offer", async offer => {
  createPeer()
  await peer.setRemoteDescription(offer)
  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)
  socket.emit("answer", answer)
})

socket.on("answer", async answer => await peer.setRemoteDescription(answer))
socket.on("ice", async candidate => { try{ await peer.addIceCandidate(candidate) }catch(e){} })
socket.on("partner-left", ()=>{
  if(peer){ peer.close(); peer=null }
  remoteVideo.srcObject=null
  document.getElementById("remoteName").innerText="Stranger"
  status.innerText="Partner left"
})

function sendMessage(){
  const msg=document.getElementById("msg")
  if(!msg.value) return
  addMessage("You", msg.value)
  socket.emit("message", msg.value)
  msg.value=""
}

socket.on("message", text => addMessage("Stranger", text))

function addMessage(user,text){
  const messages=document.getElementById("messages")
  messages.innerHTML += `<p><b>${user}:</b> ${text}</p>`
  messages.scrollTop = messages.scrollHeight
}

function toggleCamera(){ const track = localStream.getVideoTracks()[0]; track.enabled = !track.enabled }
function toggleMic(){ const track = localStream.getAudioTracks()[0]; track.enabled = !track.enabled }