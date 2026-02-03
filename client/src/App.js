import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Link (Production ke liye)
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
    
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        // Log Update Helper
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
            // Google STUN Servers Added Here
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
            // Google STUN Servers Added Here Also
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

    return (
        <div style={{ textAlign: "center", background: "#f0f2f5", minHeight: "100vh", padding: "10px", fontFamily: "monospace" }}>
            
            {/* BLACK BOX */}
            <div style={{background: "black", color: "#0f0", padding: "15px", marginBottom: "20px", border: "2px solid red"}}>
                <h3>📢 STATUS LOGS (V8-FINAL)</h3>
                <p>{logs}</p>
                <p style={{color: "yellow", fontSize: "20px"}}>My ID: {me || "Waiting..."}</p>
            </div>
            
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <video playsInline muted ref={myVideo} autoPlay style={{ width: "45%", border:"2px solid blue" }} />
                
                {callAccepted && (
                    <video playsInline ref={userVideo} autoPlay style={{ width: "45%", background: "black", border:"2px solid green" }} />
                )}
            </div>

            <div style={{ marginTop: "20px" }}>
                <button onClick={() => {navigator.clipboard.writeText(me); alert("Copied!")}} style={{padding:"10px", background:"blue", color:"white"}}>
                    Copy My ID
                </button>
                <br /><br />
                <input type="text" placeholder="Friend ID" onChange={(e) => setIdToCall(e.target.value)} style={{padding:"10px"}} />
                <button onClick={() => callUser(idToCall)} style={{background:"green", color:"white", padding:"10px"}}>Call</button>
            </div>
            
            {receivingCall && !callAccepted && (
                <div style={{marginTop:"20px", background:"yellow", padding:"10px"}}>
                    <h2>{name} Calling...</h2>
                    <button onClick={answerCall} style={{background:"green", color:"white", padding:"10px"}}>Answer</button>
                </div>
            )}
        </div>
    );
}

export default App;