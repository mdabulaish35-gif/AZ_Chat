import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io.connect("https://az-chat.onrender.com");

function App() {
    const [ me, setMe ] = useState("");
    const [ name, setName ] = useState(""); 
    const [ isNameSet, setIsNameSet ] = useState(false);
    const [ onlineUsers, setOnlineUsers ] = useState({}); 

    const [ stream, setStream ] = useState();
    const [ receivingCall, setReceivingCall ] = useState(false);
    const [ caller, setCaller ] = useState("");
    const [ callerSignal, setCallerSignal ] = useState();
    const [ callAccepted, setCallAccepted ] = useState(false);
    const [ callEnded, setCallEnded ] = useState(false);
    const [ callerName, setCallerName ] = useState("");
    
    // Status Logic
    const [ debugStatus, setDebugStatus ] = useState("Waiting...");
    const [ remoteStream, setRemoteStream ] = useState(null); 

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

        socket.on("allUsers", (users) => {
            setOnlineUsers(users);
        });

        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setCallerName(data.name);
            setCallerSignal(data.signal);
        });
    }, []);

    const submitName = () => {
        if (name.trim()) {
            socket.emit("joinRoom", name);
            setIsNameSet(true);
        }
    };

    // --- STREAM AA GAYI? TOH VIDEO MEIN DALO ---
    useEffect(() => {
        if (remoteStream && userVideo.current) {
            setDebugStatus("Attaching stream to video...");
            userVideo.current.srcObject = remoteStream;
            
            // Thoda ruk ke play karo
            setTimeout(() => {
                if (userVideo.current) {
                    userVideo.current.play().catch(e => setDebugStatus("Auto-play blocked: " + e.message));
                }
            }, 100);
        }
    }, [remoteStream]); // Jab bhi remoteStream aaye, ye chalega

    const callUser = (id) => {
        setDebugStatus("Calling user...");
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

        peer.on("stream", (remStream) => {
            setDebugStatus("Stream Received! (ID: " + remStream.id + ")");
            setRemoteStream(remStream); // State mein save karo taaki React ko pata chale
        });

        peer.on("close", () => {
            socket.off("callAccepted");
            setCallEnded(true);
            window.location.reload();
        });

        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            setDebugStatus("Call Connected!");
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        setDebugStatus("Answering...");
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

        peer.on("stream", (remStream) => {
            setDebugStatus("Stream Received! (ID: " + remStream.id + ")");
            setRemoteStream(remStream);
        });

        peer.on("close", () => {
            setCallEnded(true);
            window.location.reload();
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

    return (
        <div style={{ textAlign: "center", fontFamily: "sans-serif", paddingBottom: "50px" }}>
            <h1 style={{ color: "red" }}>AZ_chat (FINAL V5)</h1> 
            {/* Maine title RED kiya hai taaki pata chale naya code hai */}
            
            <div style={{ background: "#222", color: "#0f0", padding: "5px", fontSize: "12px" }}>
                Status: {debugStatus}
            </div>

            <div className="container" style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                
                {/* MY VIDEO */}
                <div className="video">
                    <h3>{name || "Me"}</h3>
                    <video playsInline muted ref={myVideo} autoPlay style={{ width: "100%", maxWidth: "300px", border: "5px solid #007bff" }} />
                </div>

                {/* USER VIDEO */}
                <div className="video" style={{ display: callAccepted && !callEnded ? "block" : "none" }}>
                    <h3>{callerName || "Friend"}</h3>
                    
                    {/* VIDEO PLAYER - MAGIC KEY ADDED */}
                    <video 
                        key={remoteStream ? remoteStream.id : "empty"} // <--- MAGIC KEY: Ye React ko force karega refresh karne ko
                        playsInline 
                        ref={userVideo} 
                        muted  
                        autoPlay
                        style={{ width: "100%", maxWidth: "300px", border: "5px solid #28a745", backgroundColor: "black" }} 
                    />
                </div>
            </div>

            {!isNameSet ? (
                <div style={{ marginTop: "20px", padding: "20px" }}>
                    <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "10px" }} />
                    <button onClick={submitName} style={{ padding: "10px 20px", background: "black", color: "white", marginLeft: "10px" }}>Join</button>
                </div>
            ) : (
                <div className="onlineUsers" style={{ marginTop: "20px" }}>
                    {callAccepted && !callEnded ? (
                         <button onClick={leaveCall} style={{ backgroundColor: "red", color: "white", padding: "10px" }}>End Call</button>
                    ) : (
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            {Object.keys(onlineUsers).map((key) => {
                                if (key === me) return null;
                                return (
                                    <button key={key} onClick={() => callUser(key)} style={{ padding: "10px", background: "blue", color: "white" }}>
                                        Call {onlineUsers[key]} 📞
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            
            {receivingCall && !callAccepted ? (
                <div className="caller" style={{ background: "#d4edda", padding: "20px", position: "fixed", bottom: "0", width: "100%" }}>
                    <h2>{callerName} is calling...</h2>
                    <button onClick={answerCall} style={{ backgroundColor: "green", color: "white", padding: "15px" }}>Answer</button>
                </div>
            ) : null}
        </div>
    );
}

export default App;