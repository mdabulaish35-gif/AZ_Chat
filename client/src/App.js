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

    const myVideo = useRef();
    const userVideo = useRef(); // Remote video ref
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

        // IMPORTANT UPDATE: Video ko zabardasti play karo
        peer.on("stream", (remoteStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
                userVideo.current.play().catch(err => console.error("Video play error:", err));
            }
        });

        peer.on("close", () => {
            socket.off("callAccepted");
            setCallEnded(true);
            window.location.reload();
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

        // IMPORTANT UPDATE: Video ko zabardasti play karo
        peer.on("stream", (remoteStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
                userVideo.current.play().catch(err => console.error("Video play error:", err));
            }
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
        <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
            <h1 style={{ color: "#4a90e2" }}>AZ_chat</h1>
            
            <div className="container" style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                
                {/* MY VIDEO */}
                <div className="video">
                    <h3>{name || "Me"}</h3>
                    <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", border: "5px solid #007bff" }} />
                </div>

                {/* USER VIDEO */}
                <div className="video" style={{ display: callAccepted && !callEnded ? "block" : "none" }}>
                    <h3>{callerName || "Friend"}</h3>
                    <video 
                        playsInline 
                        ref={userVideo} 
                        autoPlay 
                        style={{ width: "300px", height: "auto", border: "5px solid #28a745", backgroundColor: "black" }} 
                    />
                </div>

            </div>

            {/* LOGIN & LIST SECTION */}
            {!isNameSet ? (
                <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc", background: "#fff3cd" }}>
                    <h3>Enter your Name to Join</h3>
                    <input
                        type="text"
                        placeholder="Ex: Abulaish"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ padding: "10px", width: "200px" }}
                    />
                    <button onClick={submitName} style={{ marginLeft: "10px", backgroundColor: "black", color: "white", padding: "10px 20px" }}>
                        Join Online
                    </button>
                </div>
            ) : (
                <div className="onlineUsers" style={{ marginTop: "20px" }}>
                    
                    {callAccepted && !callEnded ? (
                         <button onClick={leaveCall} style={{ backgroundColor: "red", color: "white", padding: "10px 20px" }}>End Call</button>
                    ) : (
                        <>
                            <h3>Online Friends:</h3>
                            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                                {Object.keys(onlineUsers).map((key) => {
                                    if (key === me) return null;
                                    return (
                                        <div key={key} style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
                                            <span style={{ fontWeight: "bold", fontSize: "18px" }}>{onlineUsers[key]}</span>
                                            <br />
                                            <button 
                                                onClick={() => callUser(key)} 
                                                style={{ marginTop: "5px", backgroundColor: "blue", color: "white", padding: "5px 15px", cursor: "pointer" }}
                                            >
                                                Call Now 📞
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* CALL NOTIFICATION */}
            {receivingCall && !callAccepted ? (
                <div className="caller" style={{ marginTop: "20px", background: "#d4edda", padding: "20px", border: "2px solid green" }}>
                    <h1>{callerName} is calling...</h1>
                    <button onClick={answerCall} style={{ backgroundColor: "green", color: "white", padding: "15px 30px", fontSize: "18px", cursor: "pointer" }}>
                        Answer Call
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export default App;