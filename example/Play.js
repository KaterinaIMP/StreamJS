"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_ant_media_1 = require("@antmedia/react-native-ant-media");
export function Playing() {
    var defaultStreamName = 'stream1';
    var webSocketUrl = 'ws://localhost:8081/WebRTCAppEE/websocket';
    //or webSocketUrl: 'wss://server.com:5443/WebRTCAppEE/websocket',
    var streamNameRef = (0, react_1.useRef)(defaultStreamName);
    var _a = (0, react_1.useState)(''), remoteMedia = _a[0], setRemoteStream = _a[1];
    var _b = (0, react_1.useState)(false), isPlaying = _b[0], setIsPlaying = _b[1];
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
                case 'play_started':
                    console.log('play_started');
                    setIsPlaying(true);
                    break;
                case 'play_finished':
                    console.log('play_finished');
                    setIsPlaying(false);
                    setRemoteStream('');
                    break;
                case "newStreamAvailable":
                    if (data.streamId == streamNameRef.current)
                        setRemoteStream(data.stream.toURL());
                    break;
                default:
                    console.log(command);
                    break;
            }
        },
        callbackError: function (err, data) {
            console.error('callbackError', err, data);
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
    var handlePlay = (0, react_1.useCallback)(function () {
        if (!adaptor) {
            return;
        }
        adaptor.play(streamNameRef.current);
    }, [adaptor]);
    var handleStop = (0, react_1.useCallback)(function () {
        if (!adaptor) {
            return;
        }
        adaptor.stop(streamNameRef.current);
    }, [adaptor]);
    return (<react_native_1.SafeAreaView style={styles.container}>
      <react_native_1.View style={styles.box}>
        <react_native_1.Text style={styles.heading}>Ant Media WebRTC Play</react_native_1.Text>
        {!isPlaying ? (<>
            <react_native_1.TouchableOpacity onPress={handlePlay} style={styles.startButton}>
              <react_native_1.Text>Start Playing</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </>) : (<>
            {remoteMedia ? (<>{(0, react_native_ant_media_1.rtc_view)(remoteMedia, styles.streamPlayer)}</>) : (<></>)}
            <react_native_1.TouchableOpacity onPress={handleStop} style={styles.button}>
              <react_native_1.Text>Stop Playing</react_native_1.Text>
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
    streamPlayer: {
        width: '100%',
        height: '80%',
        alignSelf: 'center',
    },
    button: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 10,
    },
    startButton: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 10,
        top: 400,
    },
    heading: {
        alignSelf: 'center',
    },
});
