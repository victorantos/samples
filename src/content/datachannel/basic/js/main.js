/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
let isRemote = true;
let msg = null;

const urlParams = new URLSearchParams(window.location.search);
isRemote = urlParams.get('remote') == 'true'; 
console.log(isRemote ? 'this is remote peer' : 'this is local peer');
 

const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
const startButton = document.querySelector('button#startButton');
const sendButton = document.querySelector('button#sendButton');
const closeButton = document.querySelector('button#closeButton');
const handleOffer = document.querySelector('button#handleOfferButton');
const handleAnswer = document.querySelector('button#handleAnswerButton');
const handleCandidate = document.querySelector('button#handleCandidateButton');

if(isRemote)
{
  handleAnswer.style.display = 'none';
}
else{
  handleOffer.style.display = 'none';
}

window.addEventListener("ondatachannel", (ev) => {
  console.log("You knocked a datachannel?" + ev.channel );
});

startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;
handleOffer.onclick = handleOfferClick;
handleAnswer.onclick = handleAnswerClick;
handleCandidate.onclick = handleCandidateClick;

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  sendButton.disabled = true;
}

function handleOfferClick()
{
  if(isRemote)
  {
    gotDescription1(msg);
     
  }
  else{
   // do nothing
  }
}

function handleAnswerClick()
{
  if(isRemote)
  {
     // do nothing for local
  }
  else{
     
      localConnection.setRemoteDescription(msg);
  }
}

function handleCandidateClick()
{
  if(isRemote)
  {
    remoteConnection.addIceCandidate(msg);
  }
  else{
    localConnection.addIceCandidate(msg);
  }
}

function createConnection() {
  dataChannelSend.placeholder = '';
  const servers = null;

  if(!isRemote)
  {
    window.localConnection = localConnection = new RTCPeerConnection(servers);
    console.log('Created local peer connection object localConnection');

    sendChannel = localConnection.createDataChannel(name='sendDataChannel', {
       id:1, negotiated: true
    });
    console.log('Created send data channel, id='+sendChannel.id);

    localConnection.onicecandidate = e => {
      onIceCandidate(localConnection, e);
    };
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
  }
  else{
    window.remoteConnection = remoteConnection = new RTCPeerConnection(servers);
    console.log('Created remote peer connection object remoteConnection');
  
    remoteConnection.onicecandidate = e => {
      onIceCandidate(remoteConnection, e);
    };
    //remoteConnection.ondatachannel = receiveChannelCallback;

    receiveChannel = remoteConnection.createDataChannel("sendDataChannel", {id:1, negotiated: true});
    receiveChannel.onmessage = onReceiveMessageCallback;
    receiveChannel.onopen = onReceiveChannelStateChange;
    receiveChannel.onclose = onReceiveChannelStateChange;
    receiveChannel.onerror = onReceiveChannelError;
  }

  if(!isRemote)
  {
    localConnection.createOffer().then(
        gotDescription1,
        onCreateSessionDescriptionError
    );
  }
  startButton.disabled = true;
  closeButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function sendData() {
  const data = dataChannelSend.value;
  sendChannel.send(data);
  console.log('Sent Data: ' + data);
}

function closeDataChannels() {
  console.log('Closing data channels');
  sendChannel.close();
  console.log('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  console.log('Closed data channel with label: ' + receiveChannel.label);
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  console.log('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
  disableSendButton();
  enableStartButton();
}

function gotDescription1(desc) {
  if(!isRemote)
  {
    localConnection.setLocalDescription(desc);
    console.log("Offer from localConnection\n");
    console.log(JSON.stringify(desc));
  }
  else{
    remoteConnection.setRemoteDescription(desc);
    remoteConnection.createAnswer().then(
        gotDescription2,
        onCreateSessionDescriptionError
    );
  }
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  console.log(`Answer from remoteConnection\n${desc.sdp}`);
  console.log(JSON.stringify(desc));
  //localConnection.setRemoteDescription(desc);
}

function getOtherPc(pc) {
  return (pc === localConnection) ? remoteConnection : localConnection;
}

function getName(pc) {
  return (pc === localConnection) ? 'localPeerConnection' : 'remotePeerConnection';
}

function onIceCandidate(pc, event) {
  // getOtherPc(pc)
  //     .addIceCandidate(event.candidate)
  //     .then(
  //         () => onAddIceCandidateSuccess(pc),
  //         err => onAddIceCandidateError(pc, err)
  //     );
  console.log(`${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`);
  console.log(JSON.stringify(event.candidate));
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveChannelError(e){
  console.log("ERROR, onReceiveChannelError:" + e);
}
function onReceiveMessageCallback(event) {
  console.log('Received Message');
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  console.log('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  console.log(`Receive channel state is: ${readyState}`);
}
