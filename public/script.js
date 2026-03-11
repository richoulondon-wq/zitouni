const socket = io()

let peer = null
let localStream = null

const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo")
const status = document.getElementById("status")

/* ---------- GET CAMERA ---------- */

async function startCamera(){

try{

localStream = await navigator.mediaDevices.getUserMedia({
video:true,
audio:true
})

localVideo.srcObject = localStream

}catch(e){

alert("Camera or microphone permission denied")

}

}

startCamera()

/* ---------- CREATE PEER ---------- */

function createPeer(){

peer = new RTCPeerConnection({

iceServers: [

{ urls:"stun:stun.l.google.com:19302" },

{
urls:"turn:openrelay.metered.ca:80",
username:"openrelayproject",
credential:"openrelayproject"
},

{
urls:"turn:openrelay.metered.ca:443",
username:"openrelayproject",
credential:"openrelayproject"
},

{
urls:"turn:openrelay.metered.ca:3478",
username:"openrelayproject",
credential:"openrelayproject"
}

]

/* SEND LOCAL STREAM */

localStream.getTracks().forEach(track=>{
peer.addTrack(track,localStream)
})

/* RECEIVE REMOTE STREAM */

peer.ontrack = (event)=>{

remoteVideo.srcObject = event.streams[0]

}

/* SEND ICE */

peer.onicecandidate = (event)=>{

if(event.candidate){

socket.emit("ice",event.candidate)

}

}

/* CONNECTION STATUS */

peer.onconnectionstatechange = ()=>{

if(peer.connectionState === "connected"){

status.innerText = "Connected"

}

if(peer.connectionState === "disconnected"){

status.innerText = "Disconnected"

}

}

}

/* ---------- FIND USER ---------- */

function findUser(){

status.innerText = "Searching..."

socket.emit("find")

}

/* ---------- NEXT USER ---------- */

function nextUser(){

if(peer){

peer.close()
peer = null

}

remoteVideo.srcObject = null

socket.emit("next")

setTimeout(()=>{

socket.emit("find")

},500)

}

/* ---------- SOCKET EVENTS ---------- */

socket.on("status",(msg)=>{

status.innerText = msg

})

socket.on("matched",async ()=>{

createPeer()

const offer = await peer.createOffer()

await peer.setLocalDescription(offer)

socket.emit("offer",offer)

})

socket.on("offer",async (offer)=>{

createPeer()

await peer.setRemoteDescription(offer)

const answer = await peer.createAnswer()

await peer.setLocalDescription(answer)

socket.emit("answer",answer)

})

socket.on("answer",async (answer)=>{

await peer.setRemoteDescription(answer)

})

socket.on("ice",async (candidate)=>{

try{

await peer.addIceCandidate(candidate)

}catch(e){}

})

socket.on("partner-left",()=>{

if(peer){

peer.close()
peer = null

}

remoteVideo.srcObject = null

status.innerText = "Partner left"

})

/* ---------- CHAT ---------- */

function sendMessage(){

const msg = document.getElementById("msg")

if(msg.value === "") return

addMessage("You",msg.value)

socket.emit("message",msg.value)

msg.value = ""

}

socket.on("message",(text)=>{

addMessage("Stranger",text)

})

function addMessage(user,text){

const messages = document.getElementById("messages")

messages.innerHTML += `<p><b>${user}:</b> ${text}</p>`

messages.scrollTop = messages.scrollHeight

}

/* ---------- CAMERA TOGGLE ---------- */

function toggleCamera(){

if(!localStream) return

const track = localStream.getVideoTracks()[0]

track.enabled = !track.enabled

}

/* ---------- MIC TOGGLE ---------- */

function toggleMic(){

if(!localStream) return

const track = localStream.getAudioTracks()[0]

track.enabled = !track.enabled

}

