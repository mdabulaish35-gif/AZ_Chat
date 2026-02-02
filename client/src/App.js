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
    
    // Jasoosi Logs
    const [logs, setLogs] = useState("System Ready...");
    const [remoteStream, setRemoteStream] = useState(null);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    const addLog = (msg) => {
        setLogs(prev => prev + "\n" + msg);
        console.log(msg);
    };

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setStream(stream);
                if (myVideo.current) myVideo.current.srcObject = stream;
                addLog("My Camera Started");
            })
            .catch(err => addLog("Camera Error: " + err.message));

        socket.on("me", (id) => setMe(id));
        socket.on("allUsers", (users) => setOnlineUsers(users));
        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
            addLog("Incoming Call...");
        });
    }, []);

    // Force Video Attach
    const forceAttach = () => {
        if (userVideo.current && remoteStream) {
            addLog("Forcing Video Attach...");
            userVideo.current.srcObject = remoteStream;
            userVideo.current.play()
                .then(() => addLog("Video Playing Success!"))
                .catch(e => addLog("Play Error: " + e.message));
        } else {
            addLog("No Stream to attach!");
        }
    };

    const callUser = (id) => {
        addLog("Calling User...");
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

        peer.on("stream", (remStream) => {
            addLog("Stream Aayi! ID: " + remStream.id);
            addLog("Tracks: " + remStream.getTracks().length);
            addLog("Video Active? " + remStream.active);
            
            setRemoteStream(remStream);
            
            if (userVideo.current) {
                userVideo.current.srcObject = remStream;
                userVideo.current.play().catch(e => addLog("Autoplay blocked: " + e.message));
            }
        });
        
        peer.on("error", err => addLog("Peer Error: " + err.message));

        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            addLog("Call Accepted by User");
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        addLog("Answering...");
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
        });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: caller });
        });

        peer.on("stream", (remStream) => {
            addLog("Stream Aayi! ID: " + remStream.id);
            addLog("Tracks: " + remStream.getTracks().length);
            
            setRemoteStream(remStream);

            if (userVideo.current) {
                userVideo.current.srcObject = remStream;
                userVideo.current.play().catch(e => addLog("Autoplay blocked: " + e.message));
            }
        });

        peer.on("error", err => addLog("Peer Error: " + err.message));

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    return (
        <div style={{ textAlign: "center", padding: "10px", fontFamily: "monospace" }}>
            <h1 style={{color: "purple"}}>PLAN C (DIAGNOSTIC)</h1>
            
            {/* LOG BOX */}
            <div style={{
                background: "#000", color: "#0f0", 
                padding: "10px", height: "150px", overflowY: "scroll",
                textAlign: "left", fontSize: "12px", border: "2px solid red"
            }}>
                <pre>{logs}</pre>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "10px" }}>
                <video playsInline muted ref={myVideo} autoPlay style={{ width: "45%", border: "2px solid blue" }} />
                
                {callAccepted && !callEnded && (
                    <div style={{width: "45%"}}>
                        <video 
                            playsInline 
                            ref={userVideo} 
                            muted // Zaroori hai mobile ke liye
                            autoPlay 
                            style={{ width: "100%", border: "2px solid red", background: "#222" }} 
                        />
                        <button onClick={forceAttach} style={{background:"orange", width:"100%", padding:"5px"}}>
                            🛠️ Fix / Play Video
                        </button>
                    </div>
                )}
            </div>

            {!me ? <p>Connecting to Server...</p> : (
                <div style={{marginTop: "10px"}}>
                     <input placeholder="Name" onChange={(e) => {
                         setName(e.target.value);
                         if(e.target.value.length > 2) socket.emit("joinRoom", e.target.value);
                     }} />
                     
                     <div style={{marginTop: "10px"}}>
                        <h3>Online:</h3>
                        {Object.keys(onlineUsers).map(key => {
                            if (key === me) return null;
                            return <button key={key} onClick={() => callUser(key)} style={{margin:"5px", padding:"10px", background:"blue", color:"white"}}>Call {onlineUsers[key]}</button>
                        })}
                     </div>
                </div>
            )}

            {receivingCall && !callAccepted && (
                <div style={{position:"fixed", bottom:0, left:0, right:0, background:"lightgreen", padding:"20px"}}>
                    <h2>Incoming Call...</h2>
                    <button onClick={answerCall} style={{background:"green", color:"white", padding:"15px 25px"}}>Answer</button>
                </div>
            )}
        </div>
    );
}

export default App;