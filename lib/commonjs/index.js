"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rtc_view = rtc_view;
exports.useAntMedia = useAntMedia;
var _react = _interopRequireWildcard(require("react"));
var _reactNativeWebrtc = require("react-native-webrtc");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
//Interfaces

//useAntMedia main adaptor function
function useAntMedia(params) {
  const {
    url,
    mediaConstraints,
    callbackError,
    callback,
    peer_connection_config,
    debug,
    onlyDataChannel
  } = params;
  const adaptorRef = (0, _react.useRef)(null);
  let localStream = (0, _react.useRef)(null);
  const remotePeerConnection = (0, _react.useRef)({}).current;
  const remotePeerConnectionStats = (0, _react.useRef)({}).current;
  const remoteDescriptionSet = (0, _react.useRef)({}).current;
  const iceCandidateList = (0, _react.useRef)({}).current;
  const config = peer_connection_config;
  const playStreamIds = (0, _react.useRef)([]).current;
  var pingTimer = -1;
  var idMapping = new Array();
  const closePeerConnection = (0, _react.useCallback)(streamId => {
    if (debug) console.log('closePeerConnection');
    var peerConnection = remotePeerConnection[streamId];
    if (peerConnection != null) {
      delete remotePeerConnection[streamId];

      // @ts-ignore
      if (peerConnection.dataChannel != null) {
        // @ts-ignore
        peerConnection.dataChannel.close();
      }
      if (peerConnection.signalingState !== 'closed') {
        peerConnection.close();
      }
      const playStreamIndex = playStreamIds.indexOf(streamId);
      if (playStreamIndex !== -1) {
        playStreamIds.splice(playStreamIndex, 1);
      }
    }
    if (remotePeerConnectionStats[streamId] != null) {
      clearInterval(remotePeerConnectionStats[streamId].timerId);
      delete remotePeerConnectionStats[streamId];
    }
  }, [playStreamIds, remotePeerConnection, remotePeerConnectionStats]);
  const iceCandidateReceived = (0, _react.useCallback)((event, streamId) => {
    if (event.candidate) {
      const jsCmd = {
        command: 'takeCandidate',
        streamId,
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      };
      if (ws) ws.sendJson(jsCmd);
    }
  }, [ws]);
  const onTrack = (0, _react.useCallback)((event, streamId) => {
    const dataObj = {
      stream: event.streams[0],
      track: event.track,
      streamId: streamId,
      trackId: idMapping[streamId] != undefined ? idMapping[streamId][event.transceiver.mid] : undefined
    };
    if (adaptorRef.current) {
      callback.call(adaptorRef.current, 'newStreamAvailable', dataObj);
      callback.call(adaptorRef.current, 'newTrackAvailable', dataObj);
    }
  }, [callback]);
  const initDataChannel = (0, _react.useCallback)((streamId, dataChannel) => {
    dataChannel.onerror = error => {
      console.log('Data Channel Error:', error);
      const obj = {
        streamId: streamId,
        error: error
      };
      console.log('channel status: ', dataChannel.readyState);
      if (dataChannel.readyState !== 'closed' && callbackError) {
        callbackError('data_channel_error', obj);
      }
    };
    dataChannel.onmessage = event => {
      const obj = {
        streamId: streamId,
        event: event
      };
      if (callback && adaptorRef.current) callback.call(adaptorRef.current, 'data_received', obj);
    };
    dataChannel.onopen = () => {
      // @ts-ignore
      remotePeerConnection[streamId].dataChannel = dataChannel;
      console.log('Data channel is opened');
      if (callback && adaptorRef.current) callback.call(adaptorRef.current, 'data_channel_opened', streamId);
    };
    dataChannel.onclose = () => {
      console.log('Data channel is closed');
      if (callback && adaptorRef.current) callback.call(adaptorRef.current, 'data_channel_closed', streamId);
    };
  }, []);
  const initPeerConnection = (0, _react.useCallback)(async (streamId, dataChannelMode) => {
    if (debug) console.log('in initPeerConnection');
    if (remotePeerConnection[streamId] == null) {
      const closedStreamId = streamId;
      remotePeerConnection[streamId] = new _reactNativeWebrtc.RTCPeerConnection(config || {
        iceServers: []
      });
      remoteDescriptionSet[streamId] = false;
      iceCandidateList[streamId] = [];
      if (!playStreamIds.includes(streamId) && localStream.current) {
        // @ts-ignore
        localStream.current.getTracks().forEach(track => {
          remotePeerConnection[streamId].addTrack(track, localStream.current);
          //            localStream.current.getTracks().forEach((track: MediaStreamTrack) => { remotePeerConnection[streamId].addTrack(track, localStream.current); });
        });
      }
      try {
        // @ts-ignore
        remotePeerConnection[streamId].onicecandidate = event => {
          if (debug) console.log('onicecandidate', event);
          iceCandidateReceived(event, closedStreamId);
        };
        // @ts-ignore
        remotePeerConnection[streamId].ontrack = event => {
          if (debug) console.log('onTrack', event);
          onTrack(event, closedStreamId);
        };

        // @ts-ignore
        remotePeerConnection[streamId].ondatachannel = event => {
          initDataChannel(streamId, event.channel);
        };
        if (dataChannelMode === 'publish') {
          const dataChannelOptions = {
            ordered: true
          };
          const dataChannelPeer = remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
          initDataChannel(streamId, dataChannelPeer);
        } else if (dataChannelMode === 'play') {
          // @ts-ignore
          remotePeerConnection[streamId].ondatachannel = event => {
            initDataChannel(streamId, event.channel);
          };
        } else {
          const dataChannelOptions = {
            ordered: true
          };
          const dataChannelPeer = remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
          initDataChannel(streamId, dataChannelPeer);
          // @ts-ignore
          remotePeerConnection[streamId].ondatachannel = event => {
            initDataChannel(streamId, event.channel);
          };
        }
      } catch (err) {
        if (debug) console.error('initPeerConnectionError', err.message);
      }
    }
  }, [config, debug, iceCandidateList, iceCandidateReceived, onTrack, playStreamIds, remoteDescriptionSet, remotePeerConnection]);
  const gotDescription = (0, _react.useCallback)(async (configuration, streamId) => {
    try {
      if (debug) console.log('in gotDescription');

      // const response =
      await remotePeerConnection[streamId].setLocalDescription(configuration);
      const jsCmd = {
        command: 'takeConfiguration',
        streamId,
        type: configuration.type,
        sdp: configuration.sdp
      };
      if (ws) ws.sendJson(jsCmd);
    } catch (err) {
      if (debug) console.log('gotDescriptionError', err);
    }
  }, [debug, remotePeerConnection, ws]);
  const startPublishing = (0, _react.useCallback)(async streamId => {
    try {
      if (debug) console.log('in start publishing');
      await initPeerConnection(streamId, 'publish');
      const configuration = await remotePeerConnection[streamId].createOffer(config);
      await gotDescription(configuration, streamId);
    } catch (err) {
      if (debug) console.log('startPublishing error', err.message, err.stack);
    }
  }, [config, debug, gotDescription, initPeerConnection, remotePeerConnection]);
  const addIceCandidate = (0, _react.useCallback)(async (streamId, candidate) => {
    try {
      if (debug) console.log('in addIceCandidate');
      if (debug) console.debug(`addIceCandidate ${streamId}`);
      if (debug) console.debug('candidate', candidate);
      await remotePeerConnection[streamId].addIceCandidate(candidate);
    } catch (err) {}
  }, [debug, remotePeerConnection]);
  const takeConfiguration = (0, _react.useCallback)(async (streamId, configuration, typeOfConfiguration, idMap) => {
    const type = typeOfConfiguration;
    var conf = configuration;
    conf = conf.replace("a=extmap:13 urn:3gpp:video-orientation\r\n", "");
    const isTypeOffer = type === 'offer';
    idMapping[streamId] = idMap;
    if (debug) console.log('in takeConfiguration');
    let dataChannelMode = 'publish';
    if (isTypeOffer) {
      dataChannelMode = 'play';
    }
    await initPeerConnection(streamId, dataChannelMode);
    try {
      await remotePeerConnection[streamId].setRemoteDescription(new _reactNativeWebrtc.RTCSessionDescription({
        sdp: conf,
        type
      }));
      remoteDescriptionSet[streamId] = true;
      const {
        length
      } = Object.keys(iceCandidateList[streamId]);
      for (let i = 0; i < length; i++) {
        await addIceCandidate(streamId, iceCandidateList[streamId][i]);
      }
      iceCandidateList[streamId] = [];
      if (isTypeOffer) {
        const configur = await remotePeerConnection[streamId].createAnswer();
        await gotDescription(configur, streamId);
      }
    } catch (error) {
      if (error.toString().indexOf('InvalidAccessError') > -1 || error.toString().indexOf('setRemoteDescription') > -1) {
        /**
         * This error generally occurs in codec incompatibility.
         * AMS for a now supports H.264 codec. This error happens when some browsers try to open it from VP8.
         */
        if (callbackError) callbackError('notSetRemoteDescription');
      }
    }
  }, [addIceCandidate, callbackError, debug, gotDescription, iceCandidateList, initPeerConnection, remoteDescriptionSet, remotePeerConnection]);
  const takeCandidate = (0, _react.useCallback)(
  // @ts-ignore
  async (idOfTheStream, tmpLabel, tmpCandidate, sdpMid) => {
    if (debug) console.log('in takeCandidate');
    const streamId = idOfTheStream;
    const label = tmpLabel;
    const candidateSdp = tmpCandidate;
    const candidate = new _reactNativeWebrtc.RTCIceCandidate({
      sdpMLineIndex: label,
      candidate: candidateSdp,
      sdpMid
    });
    await initPeerConnection(streamId, 'peer');
    if (remoteDescriptionSet[streamId] === true) {
      await addIceCandidate(streamId, candidate);
    } else {
      if (debug) console.debug('Ice candidate is added to list because remote description is not set yet');
      const index = iceCandidateList[streamId].findIndex(i => JSON.stringify(i) === JSON.stringify(candidate));
      if (index === -1) {
        const keys = Object.keys(candidate);
        for (const key in keys) {
          // @ts-ignore
          if (candidate[key] === undefined || candidate[key] === '') {
            // @ts-ignore
            candidate[key] = null;
          }
        }
        iceCandidateList[streamId].push(candidate);
      }
    }
  }, [addIceCandidate, debug, iceCandidateList, initPeerConnection, remoteDescriptionSet]);
  var ws = (0, _react.useRef)(new WebSocket(url)).current;
  ws.sendJson = dt => {
    ws.send(JSON.stringify(dt));
  };
  (0, _react.useEffect)(() => {
    ws.onopen = () => {
      if (debug) console.log('web socket opened !');
      callback.call(adaptorRef.current, 'initiated');
      // connection opened

      getDevices();
      if (!onlyDataChannel) {
        _reactNativeWebrtc.mediaDevices.getUserMedia(mediaConstraints).then(stream => {
          // Got stream!
          if (debug) console.log('got stream');
          localStream.current = stream;
          if (debug) console.log('in stream', localStream.current);
        }).catch(error => {
          // Log error
          if (debug) console.log('got error', error, mediaConstraints);
        });
      } else {
        if (debug) console.log('only data channel');
      }
      setPingTimer();
    };
    ws.onmessage = e => {
      // a message was received
      const data = JSON.parse(e.data);
      if (debug) console.log(' onmessage', data);
      switch (data.command) {
        case 'start':
          // start  publishing
          startPublishing(data.streamId);
          break;
        case 'takeCandidate':
          //console.log(' in takeCandidate', data);
          takeCandidate(data.streamId, data.label, data.candidate, data.id);
          break;
        case 'takeConfiguration':
          takeConfiguration(data.streamId, data.sdp, data.type, data.idMapping);
          break;
        case 'stop':
          if (debug) console.log(' in stop', data);
          closePeerConnection(data.streamId);
          break;
        case 'error':
          if (debug) console.log(' in error', data);
          if (callbackError) {
            callbackError(data.definition, data);
          }
          break;
        case 'notification':
          if (debug) console.log(' in notification', data);
          if (adaptorRef.current) callback.call(adaptorRef.current, data.definition, data);
          break;
        case 'roomInformation':
          if (debug) console.log(' in roomInformation', data);
          callback.call(adaptorRef.current, data.command, data);
          break;
        case 'pong':
          if (debug) console.log(' in pong', data);
          break;
        case 'streamInformation':
          if (debug) console.log(' in streamInformation', data);
          callback.call(adaptorRef.current, data.command, data);
          break;
        case 'trackList':
          if (debug) console.log(' in trackList', data);
          callback.call(adaptorRef.current, data.command, data);
          break;
        case 'connectWithNewId':
          if (debug) console.log(' in connectWithNewId', data);
          callback.call(adaptorRef.current, data.command, data);
          break;
        case 'peerMessageCommand':
          if (debug) console.log(' in peerMessageCommand', data);
          callback.call(adaptorRef.current, data.command, data);
          break;
        default:
          if (debug) console.log(' in default', data);
          callback.call(adaptorRef.current, data.command, data);
          break;
      }
    };
    ws.onerror = e => {
      // an error occurred
      clearPingTimer();
      if (debug) console.log(e.message);
    };
    ws.onclose = e => {
      // connection closed
      clearPingTimer();
      if (debug) console.log(e.code, e.reason);
    };
  }, [callback, callbackError, closePeerConnection, config, debug, mediaConstraints, startPublishing, takeCandidate, takeConfiguration, ws]);
  const publish = (0, _react.useCallback)((streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData) => {
    let data = {};
    if (onlyDataChannel) {
      data = {
        command: 'publish',
        streamId: streamId,
        token: token,
        subscriberId: typeof subscriberId !== undefined ? subscriberId : '',
        subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : '',
        video: false,
        audio: false
      };
    } else {
      if (!localStream.current) return;
      let [video, audio] = [false, false];

      // @ts-ignore
      video = localStream.current.getVideoTracks().length > 0;
      // @ts-ignore
      audio = localStream.current.getAudioTracks().length > 0;
      data = {
        command: 'publish',
        streamId,
        token,
        subscriberId: typeof subscriberId !== undefined ? subscriberId : '',
        subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : '',
        streamName,
        mainTrack,
        video,
        audio,
        metaData
      };
    }
    if (ws) ws.sendJson(data);
  }, [ws]);

  //play
  const play = (0, _react.useCallback)((streamId, token, room, enableTracks, subscriberId, subscriberCode, metaData) => {
    playStreamIds.push(streamId);
    const data = {
      command: 'play',
      streamId,
      token,
      room,
      enableTracks,
      subscriberId: typeof subscriberId !== undefined ? subscriberId : '',
      subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : '',
      viewerInfo: typeof metaData !== undefined && metaData != null ? metaData : ""
    };
    if (token) {
      data.token = token;
    }
    if (ws) ws.sendJson(data);
  }, [playStreamIds, ws]);
  const stop = (0, _react.useCallback)(streamId => {
    closePeerConnection(streamId);
    const data = {
      command: 'stop',
      streamId: streamId
    };
    if (ws) ws.sendJson(data);
  }, [ws]);
  const join = (0, _react.useCallback)(streamId => {
    const data = {
      command: 'join',
      streamId
    };
    if (ws) ws.sendJson(data);
  }, [ws]);
  const leave = (0, _react.useCallback)(streamId => {
    const data = {
      command: 'leave',
      streamId
    };
    if (ws) ws.sendJson(data);
  }, [ws]);
  const muteLocalMic = (0, _react.useCallback)(() => {
    if (localStream.current) {
      // @ts-ignore
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }, [localStream]);
  const unmuteLocalMic = (0, _react.useCallback)(() => {
    if (localStream.current) {
      // @ts-ignore
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }, [localStream]);
  const setLocalMicVolume = (0, _react.useCallback)(volume => {
    if (localStream.current) {
      // @ts-ignore
      localStream.current.getAudioTracks().forEach(track => {
        track._setVolume(volume);
      });
    }
  }, [localStream]);
  const setRemoteAudioVolume = (0, _react.useCallback)((volume, streamId, roomName) => {
    console.log("Setting remote mic");
    // @ts-ignore
    if (typeof roomName != 'undefined' && remotePeerConnection[roomName]) {
      remotePeerConnection[roomName]._remoteStreams.forEach(stream => {
        let audioTrackID = "ARDAMSa" + streamId;
        let track = stream.getTrackById(audioTrackID);
        if (track) {
          track._setVolume(volume);
        }
      });
    } else if (remotePeerConnection[streamId]) {
      remotePeerConnection[streamId]._remoteStreams.forEach(stream => {
        let audioTrackID = "ARDAMSa" + streamId;
        let track = stream.getTrackById(audioTrackID);
        if (track) {
          track._setVolume(volume);
        }
      });
    }
  }, [remotePeerConnection]);
  const muteRemoteAudio = (0, _react.useCallback)((streamId, roomName) => {
    console.log("Muting remote mic");
    // @ts-ignore
    if (typeof roomName != 'undefined' && remotePeerConnection[roomName]) {
      remotePeerConnection[roomName]._remoteStreams.forEach(stream => {
        let audioTrackID = "ARDAMSa" + streamId;
        let track = stream.getTrackById(audioTrackID);
        if (track) {
          track.enabled = false;
        }
      });
    } else if (remotePeerConnection[streamId]) {
      remotePeerConnection[streamId]._remoteStreams.forEach(stream => {
        let audioTrackID = "ARDAMSa" + streamId;
        let track = stream.getTrackById(audioTrackID);
        if (track) {
          track.enabled = false;
        }
      });
    }
  }, [remotePeerConnection]);
  const unmuteRemoteAudio = (0, _react.useCallback)((streamId, roomName) => {
    console.log("Muting remote mic");
    // @ts-ignore
    if (typeof roomName != 'undefined' && remotePeerConnection[roomName]) {
      remotePeerConnection[roomName]._remoteStreams.forEach(stream => {
        let audioTrackID = "ARDAMSa" + streamId;
        let track = stream.getTrackById(audioTrackID);
        if (track) {
          track.enabled = true;
        }
      });
    } else if (remotePeerConnection[streamId]) {
      remotePeerConnection[streamId]._remoteStreams.forEach(stream => {
        let audioTrackID = "ARDAMSa" + streamId;
        let track = stream.getTrackById(audioTrackID);
        if (track) {
          track.enabled = true;
        }
      });
    }
  }, [remotePeerConnection]);
  const getRoomInfo = (0, _react.useCallback)((room, streamId) => {
    var data = {
      command: 'getRoomInfo',
      streamId,
      room
    };
    if (ws) ws.sendJson(data);
  }, [ws]);
  const setPingTimer = (0, _react.useCallback)(() => {
    pingTimer = setInterval(() => {
      if (ws != null) ws.sendJson({
        command: 'ping'
      });
    }, 3000);
  }, []);
  const clearPingTimer = (0, _react.useCallback)(() => {
    if (pingTimer != -1) {
      if (debug) {
        console.log("Clearing ping message timer");
      }
      clearInterval(pingTimer);
      pingTimer = -1;
    }
  }, []);

  //Data Channel
  const peerMessage = (0, _react.useCallback)((streamId, definition, data) => {
    const jsCmd = {
      command: 'peerMessageCommand',
      streamId: streamId,
      definition: definition,
      data: data
    };
    if (ws) ws.sendJson(jsCmd);
  }, [ws]);
  const getDevices = (0, _react.useCallback)(async () => {
    var deviceArray = new Array();
    try {
      const devices = await _reactNativeWebrtc.mediaDevices.enumerateDevices();
      // @ts-ignore
      devices.map(device => {
        deviceArray.push(device);
      });
      callback.call(adaptorRef.current, 'available_devices', deviceArray);
    } catch (err) {
      console.log("Cannot get devices -> error: " + err);
    }
    // @ts-ignore
    _reactNativeWebrtc.mediaDevices.ondevicechange = async () => {
      console.log("Device change event");
      getDevices();
    };
    return deviceArray;
  }, [callback]);
  const sendData = (0, _react.useCallback)((streamId, message) => {
    // @ts-ignore
    const dataChannel = remotePeerConnection[streamId].dataChannel;
    dataChannel.send(message);
    if (debug) console.log(' send message in server', message);
  }, [ws]);
  const turnOffLocalCamera = (0, _react.useCallback)(() => {
    if (localStream.current) {
      // @ts-ignore
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }, []);
  const turnOnLocalCamera = (0, _react.useCallback)(() => {
    if (localStream.current) {
      // @ts-ignore
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }, []);
  const turnOffRemoteCamera = (0, _react.useCallback)((streamId, roomName) => {
    console.log("Turning off remote camera");
    // @ts-ignore
    if (typeof roomName != 'undefined' && remotePeerConnection[roomName]) {
      remotePeerConnection[roomName]._remoteStreams.forEach(stream => {
        let videoTrackID = "ARDAMSv" + streamId;
        let track = stream.getTrackById(videoTrackID);
        if (track) {
          track.enabled = false;
        }
      });
    } else if (remotePeerConnection[streamId]) {
      remotePeerConnection[streamId]._remoteStreams.forEach(stream => {
        let videoTrackID = "ARDAMSv" + streamId;
        let track = stream.getTrackById(videoTrackID);
        if (track) {
          track.enabled = false;
        }
      });
    }
  }, [remotePeerConnection]);
  const turnOnRemoteCamera = (0, _react.useCallback)((streamId, roomName) => {
    console.log("Turning on remote camera");
    // @ts-ignore
    if (typeof roomName != 'undefined' && remotePeerConnection[roomName]) {
      remotePeerConnection[roomName]._remoteStreams.forEach(stream => {
        let videoTrackID = "ARDAMSv" + streamId;
        let track = stream.getTrackById(videoTrackID);
        if (track) {
          track.enabled = true;
        }
      });
    } else if (remotePeerConnection[streamId]) {
      remotePeerConnection[streamId]._remoteStreams.forEach(stream => {
        let videoTrackID = "ARDAMSv" + streamId;
        let track = stream.getTrackById(videoTrackID);
        if (track) {
          track.enabled = true;
        }
      });
    }
  }, [remotePeerConnection]);
  const switchCamera = (0, _react.useCallback)(() => {
    if (localStream.current) {
      // @ts-ignore
      localStream.current.getVideoTracks().forEach(track => {
        track._switchCamera();
      });
    }
  }, [localStream]);

  //adaptor ref
  (0, _react.useEffect)(() => {
    adaptorRef.current = {
      publish,
      play,
      stop,
      join,
      leave,
      getRoomInfo,
      initPeerConnection,
      localStream,
      peerMessage,
      sendData,
      muteLocalMic,
      unmuteLocalMic,
      setLocalMicVolume,
      setRemoteAudioVolume,
      muteRemoteAudio,
      unmuteRemoteAudio,
      turnOffLocalCamera,
      turnOnLocalCamera,
      turnOffRemoteCamera,
      turnOnRemoteCamera,
      switchCamera,
      getDevices
    };
  }, [publish, play, stop, localStream, join, leave, getRoomInfo, initPeerConnection, peerMessage, sendData, muteLocalMic, unmuteLocalMic, setLocalMicVolume, setRemoteAudioVolume, muteRemoteAudio, unmuteRemoteAudio, turnOffLocalCamera, turnOnLocalCamera, turnOffRemoteCamera, turnOnRemoteCamera, switchCamera, getDevices]);
  return {
    publish,
    play,
    stop,
    localStream,
    join,
    leave,
    getRoomInfo,
    initPeerConnection,
    peerMessage,
    sendData,
    setLocalMicVolume,
    setRemoteAudioVolume,
    muteLocalMic,
    unmuteLocalMic,
    muteRemoteAudio,
    unmuteRemoteAudio,
    turnOffLocalCamera,
    turnOnLocalCamera,
    turnOffRemoteCamera,
    turnOnRemoteCamera,
    switchCamera,
    getDevices
  };
} // useAntmedia fn end

function rtc_view(stream, customStyles = {
  width: '70%',
  height: '50%',
  alignSelf: 'center'
}, objectFit = 'cover') {
  if (stream instanceof _reactNativeWebrtc.MediaStreamTrack) {
    let mediaStream = new _reactNativeWebrtc.MediaStream(undefined);
    mediaStream.addTrack(stream);
    stream = mediaStream.toURL();
  }
  const props = {
    streamURL: stream,
    style: customStyles,
    objectFit: objectFit
  };

  // @ts-ignore
  return /*#__PURE__*/_react.default.createElement(_reactNativeWebrtc.RTCView, props);
}
//# sourceMappingURL=index.js.map