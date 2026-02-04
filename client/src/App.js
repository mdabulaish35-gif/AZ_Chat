import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Link
const socket = io.connect("https://az-chat.onrender.com");

// --- VIDEO COMPONENT ---
const Video = (props) => {
    const ref = useRef();
    
    useEffect(() => {
        props.peer.on("stream", stream => {
            if(ref.current) ref.current.srcObject = stream;
        });

        if (props.peer._remoteStreams && props.peer._remoteStreams.length > 0) {
            if(ref.current) ref.current.srcObject = props.peer._remoteStreams[0];
        }
        // eslint-disable-next-line
    }, []);

    return (
        <div style={{margin: "10px", position: "relative"}}>
            <video playsInline autoPlay ref={ref} style={{width: "250px", border: "2px solid #00ff00", borderRadius: "10px"}} />
            <p style={{position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 5px", margin: 0}}>User</p>
        </div>
    );
}

function App() {
    const [peers, setPeers] = useState([]);
    const [roomID, setRoomID] = useState("");
    const [joined, setJoined] = useState(false);
    
    const [stream, setStream] = useState();
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    
    const userVideoRef = useRef();
    const peersRef = useRef([]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
            setStream(currentStream);
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = currentStream;
            }

            socket.on("all users", users => {
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socket.id, currentStream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer);
                })
                setPeers(peers);
            })

            socket.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, currentStream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })
                setPeers(users => [...users, peer]);
            });

            socket.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

            // --- YAHAN CHANGE HUA HAI: (User Left Logic) ---
            socket.on("user left", id => {
                // 1. Us bande ka connection todo
                const peerObj = peersRef.current.find(p => p.peerID === id);
                if(peerObj) {
                    peerObj.peer.destroy();
                }

                // 2. List se usko hata do (Filter)
                const peers = peersRef.current.filter(p => p.peerID !== id);
                peersRef.current = peers;
                setPeers(peers);
            });
        });
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (stream && userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
        }
    }, [joined, stream]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:global.stun.twilio.com:3478" }
                ]
            }
        });

        peer.on("signal", signal => {
            socket.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:global.stun.twilio.com:3478" }
                ]
            }
        });

        peer.on("signal", signal => {
            socket.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    const joinRoom = () => {
        if(roomID !== ""){
            socket.emit("join room", roomID);
            setJoined(true);
        } else {
            alert("Room Name daalo!");
        }
    }

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if(audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if(videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setCameraOn(videoTrack.enabled);
            }
        }
    };

    const leaveRoom = () => {
        window.location.reload();
    };

    return (
        <div style={{ padding: "20px", background: "#282c34", minHeight: "100vh", textAlign: "center", color: "white" }}>
            
            <h1>👨‍👩‍👦‍👦 Group Video Chat</h1>
            
            {!joined ? (
                <div style={{marginTop: "50px"}}>
                    <input 
                        type="text" 
                        placeholder="Enter Room Name (e.g. Boss)" 
                        onChange={(e) => setRoomID(e.target.value)} 
                        style={{padding: "10px", fontSize: "16px"}}
                    />
                    <br/><br/>
                    <button onClick={joinRoom} style={{padding: "10px 20px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer", fontSize: "18px"}}>
                        Join Room
                    </button>
                    <div style={{marginTop: "30px"}}>
                        <video muted ref={userVideoRef} autoPlay playsInline style={{width: "300px", border: "2px solid red"}} />
                        <p>Camera Preview</p>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center", marginBottom: "80px"}}>
                        <div style={{margin: "10px", position: "relative"}}>
                            <video muted ref={userVideoRef} autoPlay playsInline style={{width: "250px", border: "2px solid #61dafb", borderRadius: "10px"}} />
                            <p style={{position: "absolute", bottom: "10px", left: "10px", background: "black", margin: 0, padding: "2px 5px"}}>Me {micOn ? "" : "(Muted)"}</p>
                        </div>

                        {peers.map((peer) => { // 'index' hata diya
                            return (
                                <Video key={peer.peerID} peer={peer} /> // 'key' me ID daal di
                            );
            })}
                    </div>

                    <div style={{
                        position: "fixed", 
                        bottom: "20px", 
                        left: "50%", 
                        transform: "translateX(-50%)", 
                        background: "rgba(0,0,0,0.8)", 
                        padding: "10px 20px", 
                        borderRadius: "30px", 
                        display: "flex", 
                        gap: "15px",
                        zIndex: 100
                    }}>
                        <button onClick={toggleMic} style={{...btnStyle, background: micOn ? "#4CAF50" : "#f44336"}}>
                            {micOn ? "🎤 On" : "🎤 Off"}
                        </button>

                        <button onClick={toggleCamera} style={{...btnStyle, background: cameraOn ? "#2196F3" : "#f44336"}}>
                            {cameraOn ? "📷 On" : "📷 Off"}
                        </button>

                        <button onClick={leaveRoom} style={{...btnStyle, background: "red"}}>
                            📞 Leave
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const btnStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    color: "white",
    fontWeight: "bold"
};

export default App;