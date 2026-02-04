import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Link
const socket = io.connect("https://az-chat.onrender.com");

// --- MODERN ICONS (SVG) ---
const Icons = {
    MicOn: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.66 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>,
    MicOff: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02 5.02L12 18.06l-2.98-2.04C7.89 15.26 7 13.91 7 12.33v-.17L4.13 9.29L2.86 10.56 12 19.7 21.14 10.56 19.87 9.29 16.29 12.87v.46c0 .72-.19 1.4-.53 2.02l.51.51c.32-.57.53-1.22.53-1.92v-2.12l-1.82 1.8zM12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.66 9 5v6c0 .55.15 1.06.41 1.51l2.58 2.58c.01-.03.01-.06.01-.09z"/></svg>,
    CamOn: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>,
    CamOff: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>,
    CallEnd: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M12 9c-1.6 0-3.15.25-4.6.72-.81.26-1.38 1-1.38 1.87v2.23c0 .85.55 1.6 1.34 1.82.93.26 1.9.43 2.89.49.62.04 1.18-.32 1.41-.88l1.04-2.58c.17-.42.66-.63 1.09-.45.42.17.64.66.47 1.09l-1.04 2.58c-.53 1.33-1.85 2.18-3.28 2.09-1.42-.09-2.76-.36-4.04-.78-1.78-.58-3-2.25-3-4.13V11.6c0-1.95 1.27-3.61 3.09-4.2C8.5 6.42 10.22 6 12 6s3.5.42 5.09 1.4c1.82.59 3.09 2.25 3.09 4.2v1.52c0 1.88-1.22 3.55-3 4.13-1.28.42-2.62.69-4.04.78-1.43.09-2.75-.76-3.28-2.09l-1.04-2.58c-.17-.43.05-.92.47-1.09.43-.18.92.03 1.09.45l1.04 2.58c.23.56.79.92 1.41.88.99-.06 1.96-.23 2.89-.49.79-.22 1.34-.97 1.34-1.82v-2.23c0-.87-.57-1.61-1.38-1.87C15.15 9.25 13.6 9 12 9z" transform="scale(1.2) translate(-2, -2)" fill="#fff"/></svg>
};

// --- VIDEO COMPONENT (Modern Card Style) ---
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
        <div style={styles.videoCard}>
            <video playsInline autoPlay ref={ref} style={styles.videoElement} />
            <div style={styles.nameTag}>Participant</div>
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

             // User Left Logic
             socket.on("user left", id => {
                const peerObj = peersRef.current.find(p => p.peerID === id);
                if(peerObj) {
                    peerObj.peer.destroy();
                }
                const peers = peersRef.current.filter(p => p.peerID !== id);
                peersRef.current = peers;
                setPeers(peers);
            });
        });
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (joined && stream && userVideoRef.current) {
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
        <div style={styles.container}>
            {/* Header / Logo */}
            <div style={styles.header}>
                <h2 style={{margin:0, color: "#fff", display: "flex", alignItems: "center", gap: "10px"}}>
                    📹 <span style={{fontWeight: 300}}>Abulaish</span><span style={{fontWeight: "bold"}}>Video Chat</span>
                </h2>
                {joined && <div style={styles.roomBadge}>Room: {roomID}</div>}
            </div>

            {!joined ? (
                // --- MODERN JOIN CARD ---
                <div style={styles.loginContainer}>
                    <div style={styles.loginCard}>
                        <h2 style={{color: "white", marginBottom: "5px"}}>TAlk Now</h2>
                        <p style={{color: "#aaa", marginBottom: "30px", fontSize: "14px"}}>Enter a room name to start talking</p>
                        
                        <input 
                            type="text" 
                            placeholder="Enter Room Name (e.g. Abu123..)" 
                            onChange={(e) => setRoomID(e.target.value)} 
                            style={styles.input}
                        />
                        
                        <button onClick={joinRoom} style={styles.joinBtn}>
                            Join Now
                        </button>
                    </div>
                </div>
            ) : (
                // --- ZOOM STYLE GRID ---
                <>
                    <div style={styles.gridContainer}>
                        {/* Me Video */}
                        <div style={styles.videoCard}>
                            <video muted ref={userVideoRef} autoPlay playsInline style={styles.videoElement} />
                            <div style={styles.nameTag}>You {micOn ? "" : "(Muted)"}</div>
                            <div style={{...styles.statusDot, background: micOn ? "#4CAF50" : "#f44336"}}></div>
                        </div>

                        {/* Other Videos */}
                        {peers.map((peer) => {
                            return (
                                <Video key={peer.peerID} peer={peer} />
                            );
                        })}
                    </div>

                    {/* GLASS CONTROL BAR */}
                    <div style={styles.controlsBar}>
                        <button onClick={toggleMic} style={{...styles.controlBtn, background: micOn ? "#333" : "#ea4335"}}>
                            {micOn ? <Icons.MicOn/> : <Icons.MicOff/>}
                        </button>

                        <button onClick={toggleCamera} style={{...styles.controlBtn, background: cameraOn ? "#333" : "#ea4335"}}>
                            {cameraOn ? <Icons.CamOn/> : <Icons.CamOff/>}
                        </button>

                        <button onClick={leaveRoom} style={{...styles.controlBtn, background: "#ea4335", width: "60px"}}>
                            <Icons.CallEnd/>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// --- PROFESSIONAL STYLES ---
const styles = {
    container: {
        background: "#121212", // Dark Theme
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: "hidden"
    },
    header: {
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(20,20,20,0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #333",
        zIndex: 10
    },
    roomBadge: {
        background: "#333",
        color: "#fff",
        padding: "5px 15px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "bold",
        letterSpacing: "1px"
    },
    // Login Screen Styles
    loginContainer: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1e1e1e 0%, #000000 100%)"
    },
    loginCard: {
        background: "#1e1e1e",
        padding: "40px",
        borderRadius: "15px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        textAlign: "center",
        width: "350px",
        border: "1px solid #333"
    },
    input: {
        width: "100%",
        padding: "15px",
        borderRadius: "8px",
        border: "1px solid #333",
        background: "#2c2c2c",
        color: "white",
        fontSize: "16px",
        marginBottom: "20px",
        outline: "none",
        boxSizing: "border-box"
    },
    joinBtn: {
        width: "100%",
        padding: "15px",
        borderRadius: "8px",
        border: "none",
        background: "#2196F3",
        color: "white",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "0.3s"
    },
    // Grid Styles
    gridContainer: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "20px",
        padding: "20px",
        overflowY: "auto"
    },
    videoCard: {
        position: "relative",
        width: "400px",
        height: "300px",
        background: "#000",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
        border: "1px solid #333"
    },
    videoElement: {
        width: "100%",
        height: "100%",
        objectFit: "cover", // Zoom style fill
        transform: "scaleX(-1)" // Mirror effect
    },
    nameTag: {
        position: "absolute",
        bottom: "15px",
        left: "15px",
        background: "rgba(0,0,0,0.6)",
        color: "white",
        padding: "5px 10px",
        borderRadius: "5px",
        fontSize: "12px",
        fontWeight: "600"
    },
    statusDot: {
        position: "absolute",
        top: "15px",
        right: "15px",
        width: "10px",
        height: "10px",
        borderRadius: "50%"
    },
    // Control Bar
    controlsBar: {
        position: "fixed",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(40, 40, 40, 0.7)", // Glass Effect
        backdropFilter: "blur(10px)",
        padding: "10px 25px",
        borderRadius: "50px",
        display: "flex",
        gap: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.1)"
    },
    controlBtn: {
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "0.2s ease"
    }
};

export default App;