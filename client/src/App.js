import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Link
const socket = io.connect("https://az-chat.onrender.com", { 
    transports: ["websocket"],
    reconnectionAttempts: 5
});

function App() {
    const [me, setMe] = useState("");
    const [stream, setStream] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [idToCall, setIdToCall] = useState("");
    const [name, setName] = useState("");
    const [logs, setLogs] = useState("Initializing...");
    const [callEnded, setCallEnded] = useState(false);
    
    // Controls State
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        const addLog = (msg) => setLogs(prev => msg + " | " + prev);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setStream(stream);
                if (myVideo.current) myVideo.current.srcObject = stream;
            })
            .catch(err => addLog("Camera Fail: " + err.message));

        socket.on("connect", () => {
            addLog("Connected to Server ✅");
            console.log("Connected with ID:", socket.id);
        });

        socket.on("connect_error", (err) => addLog("Conn Error: " + err.message));
        
        socket.on("me", (id) => {
            setMe(id);
            addLog("Got ID: " + id);
        });

        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setName(data.name);
            setCallerSignal(data.signal);
            addLog("Incoming Call...");
        });
    }, []);

    const callUser = (id) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:global.stun.twilio.com:3478" }
                ]
            }
        });

        peer.on("signal", (data) => {
            socket.emit("callUser", {
                userToCall: id,
                signalData: data,
                from: me,
                name: name
            });
        });

        peer.on("stream", (currentStream) => {
            if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:global.stun.twilio.com:3478" }
                ]
            }
        });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: caller });
        });

        peer.on("stream", (currentStream) => {
            if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    const leaveCall = () => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        window.location.reload();
    };

    // --- NEW FEATURES: MIC & CAMERA TOGGLE ---
    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            setMicOn(audioTrack.enabled);
        }
    };

    const toggleCamera = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            setCameraOn(videoTrack.enabled);
        }
    };

    return (
        <div style={{ textAlign: "center", background: "#282c34", minHeight: "100vh", padding: "10px", fontFamily: "sans-serif", color: "white" }}>
            
            <div style={{ padding: "10px", borderBottom: "1px solid gray", marginBottom: "20px" }}>
                <h3>🎥 VIDEO CHAT APP</h3>
                <p style={{fontSize: "12px", color: "gray"}}>{logs}</p>
                <p style={{color: "#4CAF50", fontWeight: "bold"}}>My ID: {me || "Loading..."}</p>
            </div>
            
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
                {/* My Video */}
                <div style={{ position: "relative" }}>
                    <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", borderRadius: "10px", border: "2px solid #61dafb", transform: "scaleX(-1)" }} />
                    <p style={{position: "absolute", bottom: "10px", left: "10px", margin: 0, background: "rgba(0,0,0,0.5)", padding: "2px 5px"}}>You {micOn ? "" : "(Muted)"}</p>
                </div>
                
                {/* User Video */}
                {callAccepted && !callEnded && (
                    <div style={{ position: "relative" }}>
                        <video playsInline ref={userVideo} autoPlay style={{ width: "300px", borderRadius: "10px", border: "2px solid #4CAF50" }} />
                        <p style={{position: "absolute", bottom: "10px", left: "10px", margin: 0, background: "rgba(0,0,0,0.5)", padding: "2px 5px"}}>Friend</p>
                    </div>
                )}
            </div>

            {/* BUTTONS CONTROL PANEL */}
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "15px" }}>
                
                {callAccepted && !callEnded ? (
                    <>
                        {/* MIC BUTTON */}
                        <button onClick={toggleMic} style={{ ...btnStyle, background: micOn ? "#4CAF50" : "#f44336" }}>
                            {micOn ? "🎤 Mic On" : "🚫 Mic Off"}
                        </button>

                        {/* CAMERA BUTTON */}
                        <button onClick={toggleCamera} style={{ ...btnStyle, background: cameraOn ? "#2196F3" : "#f44336" }}>
                            {cameraOn ? "📷 Cam On" : "🚫 Cam Off"}
                        </button>

                        {/* END CALL BUTTON */}
                        <button onClick={leaveCall} style={{ ...btnStyle, background: "red" }}>
                            📞 End Call
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => {navigator.clipboard.writeText(me); alert("ID Copied!")}} style={{ ...btnStyle, background: "#61dafb", color: "black" }}>
                            📋 Copy ID
                        </button>
                        
                        <div style={{display: "flex", gap: "5px"}}>
                            <input 
                                type="text" 
                                placeholder="Paste Friend ID" 
                                onChange={(e) => setIdToCall(e.target.value)} 
                                style={{padding: "10px", borderRadius: "5px", border: "none"}} 
                            />
                            <button onClick={() => callUser(idToCall)} style={{ ...btnStyle, background: "#4CAF50" }}>
                                📞 Call
                            </button>
                        </div>
                    </>
                )}
            </div>
            
            {receivingCall && !callAccepted && (
                <div style={{marginTop:"20px", background: "#fff", color: "black", padding:"20px", borderRadius: "10px"}}>
                    <h2>{name || "Someone"} is calling...</h2>
                    <button onClick={answerCall} style={{background:"green", color:"white", padding:"10px 20px", fontSize: "18px", border: "none", borderRadius: "5px", cursor: "pointer"}}>
                        Answer Call
                    </button>
                </div>
            )}
        </div>
    );
}

// Simple styling object for buttons
const btnStyle = {
    padding: "12px 20px",
    fontSize: "16px",
    border: "none",
    borderRadius: "50px",
    cursor: "pointer",
    color: "white",
    fontWeight: "bold",
    boxShadow: "0px 4px 6px rgba(0,0,0,0.2)"
};

export default App;