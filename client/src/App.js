import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io.connect("https://az-chat.onrender.com");

function App() {
    const [me, setMe] = useState("");
    const [name, setName] = useState("");
    const [stream, setStream] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});
    
    // Debugging
    const [status, setStatus] = useState("Waiting...");

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setStream(stream);
            if (myVideo.current) myVideo.current.srcObject = stream;
        });

        socket.on("me", (id) => setMe(id));
        socket.on("allUsers", (users) => setOnlineUsers(users));
        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
        });
    }, []);

    const callUser = (id) => {
        setStatus("Calling...");
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

        peer.on("stream", (remoteStream) => {
            setStatus("Stream Aayi! Tracks: " + remoteStream.getTracks().length);
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
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
        setStatus("Answering...");
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
        });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: caller });
        });

        peer.on("stream", (remoteStream) => {
            setStatus("Stream Aayi! Tracks: " + remoteStream.getTracks().length);
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1 style={{color: "green"}}>SIMPLE MODE</h1>
            <p style={{background:"yellow"}}>Status: {status}</p>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", border: "2px solid blue" }} />
                
                {callAccepted && !callEnded && (
                    <video 
                        playsInline 
                        ref={userVideo} 
                        autoPlay 
                        // Muted hataya hai taaki hum check kar sakein
                        style={{ width: "300px", border: "2px solid red", background: "black" }} 
                    />
                )}
            </div>

            {!me ? (
                <p>Loading ID...</p>
            ) : (
                <div style={{marginTop: "20px"}}>
                     <input placeholder="Name" onChange={(e) => {
                         setName(e.target.value);
                         if(e.target.value.length > 2) socket.emit("joinRoom", e.target.value);
                     }} />
                     
                     <div style={{marginTop: "20px"}}>
                        <h3>Online:</h3>
                        {Object.keys(onlineUsers).map(key => {
                            if (key === me) return null;
                            return <button key={key} onClick={() => callUser(key)} style={{margin:"5px"}}>Call {onlineUsers[key]}</button>
                        })}
                     </div>
                </div>
            )}

            {receivingCall && !callAccepted && (
                <div style={{marginTop: "20px"}}>
                    <h2>Incoming Call...</h2>
                    <button onClick={answerCall} style={{background:"green", color:"white", padding:"10px"}}>Answer</button>
                </div>
            )}
        </div>
    );
}

export default App;