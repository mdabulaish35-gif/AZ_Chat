import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { CopyToClipboard } from "react-copy-to-clipboard";

const socket = io.connect("https://az-chat.onrender.com");

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
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setStream(stream);
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }
        });

        socket.on("me", (id) => {
            setMe(id);
        });

        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setName(data.name);
            setCallerSignal(data.signal);
        });
    }, []);

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
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
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
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
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
            
            {/* --- VISUAL TEST HEADER (RED COLOR) --- */}
            <h1 style={{ color: "red", border: "2px dashed red", padding: "10px" }}>
                AZ_CHAT: WAPAS AA GAYA
            </h1>
            
            <div className="container" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "20px" }}>
                <div className="video-box">
                    <h3>{name || "Me"}</h3>
                    <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", border: "5px solid #007bff", borderRadius: "10px" }} />
                </div>

                {callAccepted && !callEnded && (
                    <div className="video-box">
                        <h3>Friend</h3>
                        <video playsInline ref={userVideo} autoPlay style={{ width: "300px", border: "5px solid #28a745", borderRadius: "10px", background: "black" }} />
                    </div>
                )}
            </div>

            <div style={{ marginTop: "30px", padding: "20px", background: "white", borderRadius: "10px", maxWidth: "400px", margin: "20px auto" }}>
                <input type="text" placeholder="Apna Naam Likhein..." value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
                
                <CopyToClipboard text={me} onCopy={() => alert("ID Copy Ho Gayi!")}>
                    <button style={{ width: "100%", padding: "10px", background: "#007bff", color: "white", border: "none", cursor: "pointer", marginBottom: "20px" }}>Copy My ID</button>
                </CopyToClipboard>

                <input type="text" placeholder="Dost ki ID yahan daalein..." value={idToCall} onChange={(e) => setIdToCall(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
                
                {callAccepted && !callEnded ? (
                    <button onClick={leaveCall} style={{ width: "100%", padding: "10px", background: "red", color: "white" }}>End Call</button>
                ) : (
                    <button onClick={() => callUser(idToCall)} style={{ width: "100%", padding: "10px", background: "green", color: "white" }}>Call</button>
                )}
            </div>

            {receivingCall && !callAccepted && (
                <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", padding: "30px", border: "2px solid green" }}>
                    <h2 style={{ color: "green" }}>{caller} is calling...</h2>
                    <button onClick={answerCall} style={{ padding: "10px 30px", background: "blue", color: "white" }}>Answer Call</button>
                </div>
            )}
        </div>
    );
}

export default App;