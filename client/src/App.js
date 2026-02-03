import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Link
const socket = io.connect("https://az-chat.onrender.com");

// --- VIDEO COMPONENT (Har user ke liye alag box) ---
const Video = (props) => {
    const ref = useRef();
    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);
    return (
        <div style={{margin: "10px", position: "relative"}}>
            <video playsInline autoPlay ref={ref} style={{width: "250px", border: "2px solid #00ff00", borderRadius: "10px"}} />
        </div>
    );
}

function App() {
    const [peers, setPeers] = useState([]); // Sab dosto ki list
    const [userVideo, setUserVideo] = useState(); // Khud ki video
    const [roomID, setRoomID] = useState(""); // Room ka naam
    const [joined, setJoined] = useState(false); // Room join kiya ya nahi
    const userVideoRef = useRef();
    const peersRef = useRef([]); // Internal Logic ke liye reference

    // Room ID
    const roomIDRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setUserVideo(stream);
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = stream;
            }

            // 1. Jab server bole "Ye rahe baaki log"
            socket.on("all users", users => {
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socket.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer);
                })
                setPeers(peers);
            })

            // 2. Jab koi naya banda room me aaye
            socket.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })
                setPeers(users => [...users, peer]);
            });

            // 3. Jab signal wapas aaye (Handshake complete)
            socket.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        });
    }, []);

    // --- LOGIC: Connection banana (Initiator) ---
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

    // --- LOGIC: Incoming Call uthana (Receiver) ---
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

    // Button Click par room join karna
    const joinRoom = () => {
        if(roomID !== ""){
            socket.emit("join room", roomID);
            setJoined(true);
        } else {
            alert("Room Name daalo!");
        }
    }

    return (
        <div style={{ padding: "20px", background: "#282c34", minHeight: "100vh", textAlign: "center", color: "white" }}>
            
            <h1>👨‍👩‍👦‍👦 Group Video Chat</h1>
            
            {/* Login Screen: Agar join nahi kiya toh input dikhao */}
            {!joined ? (
                <div style={{marginTop: "50px"}}>
                    <input 
                        type="text" 
                        placeholder="Enter Room Name (e.g. Boss)" 
                        onChange={(e) => setRoomID(e.target.value)} 
                        style={{padding: "10px", fontSize: "16px"}}
                    />
                    <br/><br/>
                    <button onClick={joinRoom} style={{padding: "10px 20px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer", fontSize: "18px"}}>
                        Join Room
                    </button>
                    <div style={{marginTop: "30px"}}>
                        <video muted ref={userVideoRef} autoPlay playsInline style={{width: "300px", border: "2px solid red"}} />
                        <p>Camera Preview</p>
                    </div>
                </div>
            ) : (
                // Video Screen: Join karne ke baad
                <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
                    {/* MERI VIDEO */}
                    <div style={{margin: "10px", position: "relative"}}>
                        <video muted ref={userVideoRef} autoPlay playsInline style={{width: "250px", border: "2px solid #61dafb", borderRadius: "10px"}} />
                        <p style={{position: "absolute", bottom: "10px", left: "10px", background: "black"}}>Me</p>
                    </div>

                    {/* DOSTO KI VIDEOS (Loop chalega) */}
                    {peers.map((peer, index) => {
                        return (
                            <Video key={index} peer={peer} />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default App;