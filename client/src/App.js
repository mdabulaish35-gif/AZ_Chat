/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// --- 1. CRASH GUARD (UPDATED) ---
if (typeof window !== 'undefined') {
    window.global = window;
    
    // Fix: Browser ko 'process' aur 'nextTick' sikha rahe hain
    window.process = window.process || {};
    window.process.env = window.process.env || { NODE_DEBUG: undefined };
    
    // Agar nextTick nahi hai, to setTimeout use karo (Ye line error hatayegi)
    if (!window.process.nextTick) {
        window.process.nextTick = function (callback) {
            setTimeout(callback, 0);
        };
    }

    try {
        window.Buffer = window.Buffer || require("buffer").Buffer;
    } catch (e) {
        window.Buffer = {};
    }
}

// --- 2. LOAD PEER ---
const Peer = require("simple-peer");

// ... baaki code same rahega ...

// Render Link
const socket = io.connect("https://az-chat.onrender.com");

// --- ICONS ---
const Icons = {
    MicOn: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.66 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>,
    MicOff: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02 5.02L12 18.06l-2.98-2.04C7.89 15.26 7 13.91 7 12.33v-.17L4.13 9.29L2.86 10.56 12 19.7 21.14 10.56 19.87 9.29 16.29 12.87v.46c0 .72-.19 1.4-.53 2.02l.51.51c.32-.57.53-1.22.53-1.92v-2.12l-1.82 1.8zM12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.66 9 5v6c0 .55.15 1.06.41 1.51l2.58 2.58c.01-.03.01-.06.01-.09z"/></svg>,
    CamOn: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>,
    CamOff: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>,
    Flip: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z"/></svg>,
    CallEnd: () => <svg fill="white" height="24" viewBox="0 0 24 24" width="24"><path d="M12 9c-1.6 0-3.15.25-4.6.72-.81.26-1.38 1-1.38 1.87v2.23c0 .85.55 1.6 1.34 1.82.93.26 1.9.43 2.89.49.62.04 1.18-.32 1.41-.88l1.04-2.58c.17-.42.66-.63 1.09-.45.42.17.64.66.47 1.09l-1.04 2.58c-.53 1.33-1.85 2.18-3.28 2.09-1.42-.09-2.76-.36-4.04-.78-1.78-.58-3-2.25-3-4.13V11.6c0-1.95 1.27-3.61 3.09-4.2C8.5 6.42 10.22 6 12 6s3.5.42 5.09 1.4c1.82.59 3.09 2.25 3.09 4.2v1.52c0 1.88-1.22 3.55-3 4.13-1.28.42-2.62.69-4.04.78-1.43.09-2.75-.76-3.28-2.09l-1.04-2.58c-.17-.43.05-.92.47-1.09.43-.18.92.03 1.09.45l1.04 2.58c.23.56.79.92 1.41.88.99-.06 1.96-.23 2.89-.49.79-.22 1.34-.97 1.34-1.82v-2.23c0-.87-.57-1.61-1.38-1.87C15.15 9.25 13.6 9 12 9z" transform="scale(1.2) translate(-2, -2)" fill="#fff"/></svg>
};

// --- VIDEO COMPONENT ---
const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        if (props.peer) {
            props.peer.on("stream", stream => {
                if (ref.current) ref.current.srcObject = stream;
            });
            if (props.peer._remoteStreams && props.peer._remoteStreams.length > 0) {
                if (ref.current) ref.current.srcObject = props.peer._remoteStreams[0];
            }
        }
    }, [props.peer]); 

    return (
        <div
            style={props.customStyle || styles.videoCard}
            onMouseDown={props.onDragStart}
            onMouseMove={props.onDragMove}
            onMouseUp={props.onDragEnd}
            onTouchStart={props.onDragStart}
            onTouchMove={props.onDragMove}
            onTouchEnd={props.onDragEnd}
            onClick={props.onClick}
        >
            <video playsInline autoPlay ref={ref} style={styles.videoElement} />
            <div style={styles.nameTag}>User</div>
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

    const [pos, setPos] = useState({ x: window.innerWidth - 130, y: window.innerHeight - 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [bigMe, setBigMe] = useState(false);
    const [facingMode, setFacingMode] = useState("user");

    const isLeaving = useRef(false);

    const userVideoRef = useRef();
    const peersRef = useRef([]); // Direct Peer Store
    const streamRef = useRef();

    const isOneOnOne = peers.length === 1;

    // --- DRAG LOGIC ---
    const getDragHandlers = (isFloating) => {
        if(!isFloating) return {};
        return { onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd };
    };

    // --- REFRESH PROTECTION ---
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isLeaving.current) return;
            if (joined) {
                const message = "Are you sure you want to leave?";
                event.returnValue = message;
                return message;
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [joined]);

    const handleDragStart = () => { if (isOneOnOne) setIsDragging(true); };
    const handleDragEnd = () => { setIsDragging(false); };
    const handleDragMove = (e) => {
        if (!isDragging || !isOneOnOne) return;
        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            e.preventDefault();
            clientX = e.clientX;
            clientY = e.clientY;
        }
        setPos({ x: clientX - 50, y: clientY - 70 });
    };

    const toggleView = () => { if (isOneOnOne) setBigMe(!bigMe); };

    useEffect(() => {
        startVideo("user");

        socket.on("all users", users => {
            const peers = [];
            users.forEach(userID => {
                const peer = createPeer(userID, socket.id, streamRef.current);
                if(peer) {
                    peer.peerID = userID;
                    peersRef.current.push(peer);
                    peers.push(peer);
                }
            })
            setPeers(peers);
        });

        socket.on("user joined", payload => {
            // FIX 1: Duplicate User Check (Ye line duplicates rokti hai)
            const alreadyExists = peersRef.current.find(p => p.peerID === payload.callerID);
            if (alreadyExists) return;

            const peer = addPeer(payload.signal, payload.callerID, streamRef.current);
            if(peer) {
                peer.peerID = payload.callerID;
                peersRef.current.push(peer);
                setPeers(prevPeers => [...prevPeers, peer]);
            }
        });

        socket.on("receiving returned signal", payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) item.signal(payload.signal);
        });

        socket.on("user left", id => {
            console.log("User Left ID:", id); // Debug Log

            // FIX 2: Peer ko dhoondh ke destroy karo
            const peerObj = peersRef.current.find(p => p.peerID === id);
            if (peerObj) {
                try {
                    peerObj.destroy();
                } catch(e) { console.error("Peer destroy error:", e); }
            }

            // List ko filter karo
            const filteredPeers = peersRef.current.filter(p => p.peerID !== id);
            peersRef.current = filteredPeers;

            // FIX 3: State update karke video hatao
            setPeers(prevPeers => prevPeers.filter(peer => peer.peerID !== id));
        });

        return () => { 
            socket.off("user left");
            socket.off("user joined");
            socket.off("receiving returned signal");
            socket.off("all users");
        };
    }, []);

    const startVideo = (mode) => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: true })
            .then(currentStream => {
                if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
                setStream(currentStream);
                streamRef.current = currentStream;
                if (userVideoRef.current) userVideoRef.current.srcObject = currentStream;

                peersRef.current.forEach((peer) => {
                    if (peer && !peer.destroyed) {
                        try {
                            const oldTrack = peer.streams[0]?.getVideoTracks()[0];
                            const newTrack = currentStream.getVideoTracks()[0];
                            if (oldTrack && newTrack) peer.replaceTrack(oldTrack, newTrack, peer.streams[0]);
                        } catch(e) { console.log(e) }
                    }
                });
            })
            .catch(err => console.error("Camera Error:", err));
    };

    const switchCamera = () => {
        const newMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(newMode);
        startVideo(newMode);
    };

    useEffect(() => {
        if (joined && stream && userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
        }
    }, [joined, stream]);

    function createPeer(userToSignal, callerID, stream) {
        if(!stream) return null;
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
            config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
        });
        peer.on("signal", signal => socket.emit("sending signal", { userToSignal, callerID, signal }));
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        if(!stream) return null;
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
        });
        peer.on("signal", signal => socket.emit("returning signal", { signal, callerID }));
        peer.signal(incomingSignal);
        return peer;
    }

    const joinRoom = () => {
        if (roomID !== "") {
            socket.emit("join room", roomID);
            setJoined(true);
        } else {
            alert("Please enter a Room Name");
        }
    }

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setCameraOn(videoTrack.enabled);
            }
        }
    };

    const leaveRoom = () => {
        isLeaving.current = true;
        window.location.reload();
    };

    const getPeerStyle = () => {
        if (!isOneOnOne) return styles.videoCard; 
        return bigMe ? { ...styles.floatingMe, left: pos.x, top: pos.y } : styles.oneOnOnePeer;
    };

    const getMeStyle = () => {
        if (!isOneOnOne) return styles.videoCard; 
        return bigMe ? styles.oneOnOnePeer : { ...styles.floatingMe, left: pos.x, top: pos.y };
    };

    return (
        <div style={styles.container} onMouseMove={handleDragMove} onMouseUp={handleDragEnd}>
            <div style={styles.header}>
                <h2 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "10px", fontSize: "1.2rem" }}>
                    📹 <span style={{ fontWeight: 300 }}>A_Z</span><span style={{ fontWeight: "bold" }}> Video Chat</span>
                </h2>
                {joined && <div style={styles.roomBadge}>Room: {roomID}</div>}
            </div>

            {!joined ? (
                <div style={styles.loginContainer}>
                    <img 
                        src="/background-collage.png" 
                        alt="Background Decoration"
                        style={{
                            position: 'absolute',
                            top: '-5%', left: '-5%', width: '110%', height: '110%',
                            objectFit: 'cover', opacity: 0.3, zIndex: 1,
                        }}
                        className="floating-img" 
                    />

                    <div style={styles.loginCard}>
                        <h2 style={{ color: "white", marginTop: "0", marginBottom: "10px" }}>TAlk Now </h2>
                        
                        <h4 style={{ color: "#4CAF50", marginTop: "0", marginBottom: "30px", fontWeight: "normal", fontSize: "18px" }}>
                            Enter Room Name To Talk
                        </h4>
                        
                        <input
                            type="text"
                            name="room"
                            placeholder="Enter Room Name Here"
                            onChange={(e) => setRoomID(e.target.value)}
                            style={styles.input}
                        />
                        <button onClick={joinRoom} style={styles.joinBtn}>Join Now</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={styles.gridContainer}>
                        {peers.map((peer) => {
                            // Check: ID hona zaroori hai
                            if (!peer.peerID) return null; 

                            return (
                                <Video 
                                    key={peer.peerID} // FIX: Index nahi, ID use kiya hai
                                    peer={peer} 
                                    customStyle={getPeerStyle()} 
                                    onDragStart={getDragHandlers(isOneOnOne && bigMe).onDragStart}
                                    onDragMove={getDragHandlers(isOneOnOne && bigMe).onDragMove}
                                    onDragEnd={getDragHandlers(isOneOnOne && bigMe).onDragEnd}
                                    onClick={bigMe ? toggleView : null}
                                />
                            );
                        })}
                        <div
                            style={getMeStyle()}
                            onClick={!bigMe ? toggleView : null}
                            onMouseDown={getDragHandlers(!bigMe).onDragStart}
                            onTouchStart={getDragHandlers(!bigMe).onDragStart}
                            onTouchMove={getDragHandlers(!bigMe).onDragMove}
                            onTouchEnd={getDragHandlers(!bigMe).onDragEnd}
                        >
                            <video muted ref={userVideoRef} autoPlay playsInline style={styles.videoElement} />
                            {!isOneOnOne && <div style={styles.nameTag}>You</div>}
                            <div style={{ ...styles.statusDot, background: micOn ? "#4CAF50" : "#f44336" }}></div>
                        </div>
                    </div>

                    <div style={styles.controlsBar}>
                        <button onClick={toggleMic} style={{ ...styles.controlBtn, background: micOn ? "#333" : "#ea4335" }}>
                            {micOn ? <Icons.MicOn /> : <Icons.MicOff />}
                        </button>
                        <button onClick={toggleCamera} style={{ ...styles.controlBtn, background: cameraOn ? "#333" : "#ea4335" }}>
                            {cameraOn ? <Icons.CamOn /> : <Icons.CamOff />}
                        </button>
                        <button onClick={switchCamera} style={{ ...styles.controlBtn, background: "#333" }}>
                            <Icons.Flip />
                        </button>
                        <button onClick={leaveRoom} style={{ ...styles.controlBtn, background: "#ea4335", width: "60px" }}>
                            <Icons.CallEnd />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const styles = {
    container: { background: "#121212", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif", overflow: "hidden" },
    header: { padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a1a", borderBottom: "1px solid #333", height: "60px", zIndex: 20 },
    roomBadge: { background: "#333", color: "#fff", padding: "5px 12px", borderRadius: "20px", fontSize: "0.8rem" },
    loginContainer: { 
        flex: 1, 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        background: "#000",
        position: "relative",
        overflow: "hidden"
    },
    loginCard: { 
        background: "#1e1e1e", 
        padding: "30px", 
        borderRadius: "15px", 
        textAlign: "center", 
        width: "90%", 
        maxWidth: "400px", 
        border: "1px solid #333",
        zIndex: 2, 
        position: "relative"
    },
    input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#2c2c2c", color: "white", fontSize: "16px", marginBottom: "20px", outline: "none", boxSizing: "border-box" },
    joinBtn: { width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "#2196F3", color: "white", fontSize: "16px", cursor: "pointer" },
    gridContainer: { 
        flex: 1, 
        display: "flex", 
        flexWrap: "wrap", 
        justifyContent: "center", 
        alignItems: "center", 
        gap: "10px", 
        padding: "10px", 
        paddingBottom: "100px", 
        overflowY: "auto", 
        position: "relative" 
    },
    videoCard: { 
        position: "relative", 
        background: "#000", 
        borderRadius: "12px", 
        overflow: "hidden", 
        border: "1px solid #333", 
        flex: "1 1 40%", 
        minWidth: "140px", 
        maxWidth: "600px", 
        aspectRatio: "1.33", 
        maxHeight: "45vh"
    },
    oneOnOnePeer: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" },
    floatingMe: { position: "fixed", width: "120px", height: "160px", borderRadius: "10px", overflow: "hidden", border: "2px solid #fff", boxShadow: "0 5px 15px rgba(0,0,0,0.5)", zIndex: 50, background: "#000", cursor: "grab", touchAction: "none" },
    videoElement: { width: "100%", height: "100%", objectFit: "contain", transform: "scaleX(-1)", background: "#000" },
    nameTag: { position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.6)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" },
    statusDot: { position: "absolute", top: "10px", right: "10px", width: "8px", height: "8px", borderRadius: "50%" },
    controlsBar: { position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(40, 40, 40, 0.9)", padding: "10px 20px", borderRadius: "50px", display: "flex", gap: "15px", zIndex: 100, maxWidth: "95%", overflowX: "auto" },
    controlBtn: { width: "45px", height: "45px", borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
};

export default App;