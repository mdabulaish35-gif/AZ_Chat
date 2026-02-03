import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Server Link
const socket = io.connect("https://az-chat.onrender.com", {
    transports: ["websocket"],
    upgrade: false
});

function App() {
    const [me, setMe] = useState("");
    const [stream, setStream] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [idToCall, setIdToCall] = useState("");
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState("");
    
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        // Camera Permission
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setStream(stream);
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }
        });

        socket.on("me", (id) => setMe(id));

        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setName(data.name);
            setCallerSignal(data.signal);
        });
    }, []);

    // --- COPY ID FUNCTION (Native Browser Logic) ---
    const copyId = () => {
        navigator.clipboard.writeText(me);
        alert("ID Copy ho gayi! Dost ko bhejein.");
    };

    const callUser = (id) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream
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
            stream: stream
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
        connectionRef.current.destroy();
        window.location.reload();
    };

    return (
        <div style={{ textAlign: "center", fontFamily: "sans-serif", background: "#f0f2f5", minHeight: "100vh", padding: "20px" }}>
            
            {/* GREEN HEADER - VISUAL PROOF */}
            <h1 style={{ color: "green", borderBottom: "5px solid green", paddingBottom: "10px" }}>
                AZ_CHAT: MANUAL MODE (FIXED)
            </h1>
            
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "20px" }}>
                <div style={{background:"white", padding:"10px", borderRadius:"10px"}}>
                    <h3 style={{color: me ? "black" : "red"}}>
    {me ? (name || "Me") : "⏳ Connecting to Server..."}
</h3>
                    <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", borderRadius: "10px" }} />
                </div>

                {callAccepted && !callEnded && (
                    <div style={{background:"white", padding:"10px", borderRadius:"10px"}}>
                        <h3>Friend</h3>
                        <video playsInline ref={userVideo} autoPlay style={{ width: "300px", borderRadius: "10px", background: "black" }} />
                    </div>
                )}
            </div>

            <div style={{ marginTop: "30px", padding: "20px", background: "white", borderRadius: "10px", maxWidth: "400px", margin: "20px auto", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}>
                <input type="text" placeholder="Apna Naam..." value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
                
                {/* SIMPLE COPY BUTTON */}
                <button onClick={copyId} style={{ width: "100%", padding: "10px", background: "#007bff", color: "white", border: "none", cursor: "pointer", marginBottom: "20px" }}>
                    Copy My ID
                </button>

                <input type="text" placeholder="Paste Friend ID here..." value={idToCall} onChange={(e) => setIdToCall(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
                
                {callAccepted && !callEnded ? (
                    <button onClick={leaveCall} style={{ width: "100%", padding: "10px", background: "red", color: "white" }}>End Call</button>
                ) : (
                    <button onClick={() => callUser(idToCall)} style={{ width: "100%", padding: "10px", background: "green", color: "white" }}>Call</button>
                )}
            </div>

            {receivingCall && !callAccepted && (
                <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", padding: "30px", boxShadow: "0 0 20px rgba(0,0,0,0.2)", borderRadius:"10px", border:"2px solid green" }}>
                    <h2 style={{ color: "green" }}>{caller} is calling...</h2>
                    <button onClick={answerCall} style={{ padding: "10px 30px", background: "blue", color: "white", cursor: "pointer" }}>Answer Call</button>
                </div>
            )}
        </div>
    );
}

export default App;