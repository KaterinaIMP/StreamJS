import React, { MutableRefObject } from 'react';
import { RTCPeerConnection, RTCIceCandidate, MediaStream, MediaStreamTrack } from 'react-native-webrtc';
export interface Params {
    url: string;
    mediaConstraints: any;
    callback(this: Adaptor, message: string, data?: any): void;
    callbackError?: (errorMessage: string, data?: any) => void;
    peer_connection_config?: any;
    debug?: boolean;
    onlyDataChannel?: boolean;
}
export interface RemoteStreams {
    [key: string]: MediaStream;
}
export interface Adaptor {
    publish: (streamId: string, token?: string, subscriberId?: string, subscriberCode?: string, streamName?: string, mainTrack?: string, metaData?: string) => void;
    play: (streamId: string, token?: string, room?: string, enableTracks?: MediaStream[], subscriberId?: string, subscriberCode?: string, metaData?: string) => void;
    stop: (streamId: string) => void;
    join: (streamId: string) => void;
    leave: (streamId: string) => void;
    getRoomInfo: (room: string, streamId?: string) => void;
    initPeerConnection: (streamId: string, dataChannelMode: 'publish' | 'play' | 'peer') => Promise<void>;
    localStream: MutableRefObject<MediaStream | null>;
    peerMessage: (streamId: string, definition: any, data: any) => void;
    sendData: (streamId: string, message: string) => void;
    muteLocalMic: () => void;
    unmuteLocalMic: () => void;
    setLocalMicVolume: (volume: number) => void;
    setRemoteAudioVolume: (volume: number, streamId: string, roomName: string | undefined) => void;
    muteRemoteAudio: (streamId: string, roomName: string | undefined) => void;
    unmuteRemoteAudio: (streamId: string, roomName: string | undefined) => void;
    turnOffLocalCamera: () => void;
    turnOnLocalCamera: () => void;
    turnOffRemoteCamera: () => void;
    turnOnRemoteCamera: () => void;
    switchCamera: () => void;
    getDevices: () => Promise<any>;
}
export interface RemotePeerConnection {
    [key: string]: RTCPeerConnection;
}
export interface RemotePeerConnectionStats {
    [key: string]: {
        timerId: number;
    };
}
export interface RemoteDescriptionSet {
    [key: string]: boolean;
}
export interface IceCandidateList {
    [key: string]: RTCIceCandidate[];
}
export interface Sender {
    track: MediaStreamTrack;
    getParameters: () => {
        encodings?: any;
    };
    setParameters: (data: any) => Record<string, unknown>;
}
export declare function useAntMedia(params: Params): Adaptor;
export declare function rtc_view(stream: any, customStyles?: any, objectFit?: any): React.JSX.Element;
