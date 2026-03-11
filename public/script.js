const socket = io()

let peer
let localStream

const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo")
const status = document.getElementById("status")

navigator.mediaDevices.getUserMedia({
video:true,
audio:true
}).then(stream=>{

localStream = stream
localVideo.srcObject = stream

})

function createPeer(){

const peer = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },

    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },

    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
});
localStream.getTracks().forEach(track=>{
peer.addTrack(track,localStream)
})

peer.ontrack = (event)=>{
  remoteVideo.srcObject = event.streams[0];
};

peer.onicecandidate = e=>{
if(e.candidate){
socket.emit("ice",e.candidate)
}
}

}

function findUser(){
socket.emit("find")
}

function nextUser(){

if(peer){
peer.close()
peer=null
}

remoteVideo.srcObject=null

socket.emit("next")

setTimeout(()=>{
socket.emit("find")
},500)

}

socket.on("status",msg=>{
status.innerText = msg
})

socket.on("matched",async()=>{

createPeer()

const offer = await peer.createOffer()

await peer.setLocalDescription(offer)

socket.emit("offer",offer)

})

socket.on("offer",async offer=>{

createPeer()

await peer.setRemoteDescription(offer)

const answer = await peer.createAnswer()

await peer.setLocalDescription(answer)

socket.emit("answer",answer)

})

socket.on("answer",async answer=>{
await peer.setRemoteDescription(answer)
})

socket.on("ice",async candidate=>{
try{
await peer.addIceCandidate(candidate)
}catch(e){}
})

socket.on("partner-left",()=>{
remoteVideo.srcObject=null
status.innerText="Partner left"
})

function sendMessage(){

let msg=document.getElementById("msg")

if(msg.value==="") return

addMessage("You",msg.value)

socket.emit("message",msg.value)

msg.value=""

}

socket.on("message",text=>{
addMessage("Stranger",text)
})

function addMessage(user,text){

let messages=document.getElementById("messages")

messages.innerHTML+=`<p><b>${user}:</b> ${text}</p>`

messages.scrollTop=messages.scrollHeight

}

function toggleCamera(){
localStream.getVideoTracks()[0].enabled =
!localStream.getVideoTracks()[0].enabled
}

function toggleMic(){
localStream.getAudioTracks()[0].enabled =
!localStream.getAudioTracks()[0].enabled

}

