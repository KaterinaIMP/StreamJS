"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Conference;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_ant_media_1 = require("@antmedia/react-native-ant-media");
var Ionicons_1 = require("react-native-vector-icons/Ionicons");
var react_native_2 = require("react-native");
var react_native_incall_manager_1 = require("react-native-incall-manager");
var publishStreamId;
 function Conference() {
    var defaultRoomName = 'room1';
    var webSocketUrl = 'ws://localhost:8081/WebRTCAppEE/websocket';
    //or webSocketUrl: 'wss://server.com:5443/WebRTCAppEE/websocket',
    var _a = (0, react_1.useState)(''), localMedia = _a[0], setLocalMedia = _a[1];
    var _b = (0, react_1.useState)(false), isPublishing = _b[0], setIsPublishing = _b[1];
    var _c = (0, react_1.useState)(false), isPlaying = _c[0], setIsPlaying = _c[1];
    var _d = (0, react_1.useState)(defaultRoomName), roomId = _d[0], setRoomId = _d[1];
    var _e = (0, react_1.useState)([]), remoteTracks = _e[0], setremoteTracks = _e[1];
    var _f = (0, react_1.useState)(false), isMuted = _f[0], setIsMuted = _f[1];
    var _g = (0, react_1.useState)(true), isCameraOpen = _g[0], setIsCameraOpen = _g[1];
    var adaptor = (0, react_native_ant_media_1.useAntMedia)({
        url: webSocketUrl,
        mediaConstraints: {
            audio: true,
            video: {
                width: 640,
                height: 480,
                frameRate: 30,
                facingMode: 'front',
            },
        },
        callback: function (command, data) {
            switch (command) {
                case 'pong':
                    break;
                case 'publish_started':
                    adaptor.play(roomId, undefined, roomId, []);
                    setIsPlaying(true);
                    setIsPublishing(true);
                    break;
                case 'publish_finished':
                    setIsPublishing(false);
                    break;
                case 'play_finished':
                    console.log('play_finished');
                    removeRemoteVideo();
                    break;
                case "newTrackAvailable":
                    {
                        var incomingTrackId = data.track.id.substring("ARDAMSx".length);
                        if (incomingTrackId == roomId || incomingTrackId == publishStreamId) {
                            return;
                        }
                        console.log("new track available with id ", incomingTrackId);
                        setremoteTracks(function (prevTracks) {
                            var _a;
                            var updatedTracks = __assign(__assign({}, prevTracks), (_a = {}, _a[data.track.id] = data, _a));
                            return updatedTracks;
                        });
                        data.stream.onremovetrack = function (event) {
                            console.log("track is removed with id: " + event.track.id);
                            removeRemoteVideo(event.track.id);
                        };
                    }
                    break;
                case "available_devices":
                    console.log('available_devices', data);
                    break;
                default:
                    break;
            }
        },
        callbackError: function (err, data) {
            if (err === "no_active_streams_in_room" || err === "no_stream_exist") {
                // it throws this error when there is no stream in the room
                // so we shouldn't reset streams list
            }
            else {
                console.error('callbackError', err, data);
            }
        },
        peer_connection_config: {
            iceServers: [
                {
                    url: 'stun:stun.l.google.com:19302',
                },
            ],
        },
        debug: true,
    });
    var handleMic = (0, react_1.useCallback)(function () {
        if (adaptor) {
            (isMuted) ? adaptor.unmuteLocalMic() : adaptor.muteLocalMic();
            setIsMuted(!isMuted);
        }
    }, [adaptor, isMuted]);
    var handleCamera = (0, react_1.useCallback)(function () {
        if (adaptor) {
            (isCameraOpen) ? adaptor.turnOffLocalCamera() : adaptor.turnOnLocalCamera();
            setIsCameraOpen(!isCameraOpen);
        }
    }, [adaptor, isCameraOpen]);
    var handleConnect = (0, react_1.useCallback)(function () {
        if (adaptor) {
            publishStreamId = generateRandomString(12);
            adaptor.publish(publishStreamId, undefined, undefined, undefined, undefined, roomId, "");
        }
    }, [adaptor, roomId]);
    var handleDisconnect = (0, react_1.useCallback)(function () {
        if (adaptor) {
            adaptor.stop(publishStreamId);
            adaptor.stop(roomId);
            removeRemoteVideo();
            setIsPlaying(false);
            setIsPublishing(false);
        }
    }, [adaptor, roomId]);
    /*
      const handleRemoteAudio = useCallback((streamId: string) => {
        if (adaptor) {
          adaptor?.muteRemoteAudio(streamId, roomId);
          //adaptor?.unmuteRemoteAudio(streamId, roomId);
        }
      }, [adaptor]);
    */
    var removeRemoteVideo = function (streamId) {
        if (streamId != null || streamId != undefined) {
            setremoteTracks(function (prevTracks) {
                var updatedTracks = __assign({}, prevTracks);
                if (updatedTracks[streamId]) {
                    delete updatedTracks[streamId];
                    console.log('Deleting Remote Track:', streamId);
                    return updatedTracks;
                }
                else {
                    return prevTracks;
                }
            });
            return;
        }
        console.info("clearing all the remote renderer", remoteTracks, streamId);
        setremoteTracks([]);
    };
    (0, react_1.useEffect)(function () {
        var verify = function () {
            if (adaptor.localStream.current && adaptor.localStream.current.toURL()) {
                var videoTrack = adaptor.localStream.current.getVideoTracks()[0];
                // @ts-ignore
                return setLocalMedia(videoTrack);
            }
            setTimeout(verify, 5000);
        };
        verify();
    }, [adaptor.localStream]);
    (0, react_1.useEffect)(function () {
        if (localMedia && remoteTracks) {
            react_native_incall_manager_1.default.start({ media: 'video' });
            react_native_2.DeviceEventEmitter.addListener("onAudioDeviceChanged", function (event) {
                console.log("onAudioDeviceChanged", event.availableAudioDeviceList);
            });
        }
    }, [localMedia, remoteTracks]);
    var generateRandomString = function (length) {
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var result = '';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            var randomIndex = Math.floor(Math.random() * charactersLength);
            result += characters.charAt(randomIndex);
        }
        return result;
    };
    return (<react_native_1.SafeAreaView style={styles.container}>
      <react_native_1.View style={styles.box}>
        <react_native_1.Text style={styles.heading}>Ant Media WebRTC Multi-track Conference</react_native_1.Text>
        <react_native_1.Text style={styles.heading}>Local Stream</react_native_1.Text>
        {localMedia ? <>{(0, react_native_ant_media_1.rtc_view)(localMedia, styles.localPlayer)}</> : <></>}
        {!isPlaying ? (<>
            <react_native_1.TouchableOpacity onPress={handleConnect} style={styles.button}>
              <react_native_1.Text>Join Room</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </>) : (<>
              <react_native_1.View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <react_native_1.TouchableOpacity onPress={handleMic} style={styles.roundButton}>
                  <Ionicons_1.default name={isMuted ? 'mic-off-outline' : 'mic-outline'} size={15} color="#000"/>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity onPress={handleCamera} style={styles.roundButton}>
                  <Ionicons_1.default name={isCameraOpen ? 'videocam-outline' : 'videocam-off-outline'} size={15} color="#000"/>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            <react_native_1.Text style={styles.heading1}>Remote Streams</react_native_1.Text>
            {<react_native_1.ScrollView horizontal={true} contentContainerStyle={{
                    flexDirection: 'column',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    margin: 5,
                }} style={{ overflow: 'hidden' }}>
                {Object.values(remoteTracks).map(function (trackObj, index) {
                    //@ts-ignore
                    console.log('index', index, trackObj.track.id);
                    if (trackObj)
                        return (
                        // @ts-ignore
                        <react_native_1.View key={index} style={trackObj.track.kind === 'audio' ? { display: 'none' } : {}}>
                        <>{
                            // @ts-ignore
                            (0, react_native_ant_media_1.rtc_view)(trackObj.track, styles.players)}</>
                        {/*
                            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                              <TouchableOpacity onPress={()=>{
                                // @ts-ignore
                                handleRemoteAudio(trackObj.track.id.substring("ARDAMSx".length))
                                }} style={styles.roundButton}>
                                  <Icon name={trackObj.track.enabled ? 'mic-outline' : 'mic-off-outline'} size={15} color="#000" />
                              </TouchableOpacity>
                            </View>
                            */}
                      </react_native_1.View>);
                })}
              </react_native_1.ScrollView>}
            <react_native_1.TouchableOpacity style={styles.button} onPress={handleDisconnect}>
              <react_native_1.Text style={styles.btnTxt}>Leave Room</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </>)}

      </react_native_1.View>
    </react_native_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    box: {
        alignSelf: 'center',
        width: '80%',
        height: '80%',
    },
    players: {
        backgroundColor: '#DDDDDD',
        paddingVertical: 5,
        paddingHorizontal: 10,
        margin: 5,
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignSelf: 'center',
    },
    localPlayer: {
        backgroundColor: '#DDDDDD',
        borderRadius: 5,
        marginBottom: 5,
        height: 180,
        flexDirection: 'row',
    },
    btnTxt: {
        color: 'black',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DDDDDD',
        padding: 10,
        width: '100%',
        marginTop: 20,
    },
    heading: {
        alignSelf: 'center',
        marginBottom: 5,
        padding: 2,
    },
    heading1: {
        alignSelf: 'center',
        marginTop: 20,
    },
    roundButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DDDDDD',
        padding: 5,
        borderRadius: 25, // This will make the button round
        width: 30, // Diameter of the button
        height: 30, // Diameter of the button
        marginTop: 10,
        marginHorizontal: 10,
    },
});
