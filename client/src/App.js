import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

// Render Link
const socket = io.connect("https://az-chat.onrender.com");

// --- VIDEO COMPONENT (FIXED) ---
const Video = (props) => {
    const ref = useRef();
    
    useEffect(() => {
        // 1. Agar abhi stream aayi, toh play karo
        props.peer.on("stream", stream => {
            if(ref.current) ref.current.srcObject = stream;
        });

        // 2. [IMPORTANT FIX] Agar stream PEHLE hi aa chuki thi (aur humne miss kar di)
        // toh usko 'simple-peer' ke andar se dhoondh kar chala do.
        // '_remoteStreams' ek hidden property hoti hai jahan stream store hoti hai.
        if (props.peer._remoteStreams && props.peer._remoteStreams.length > 0) {
            if(ref.current) ref.current.srcObject = props.peer._remoteStreams[0];
        }
        
        // eslint-disable-next-line
    }, []);

    return (
        <div style={{margin: "10px", position: "relative"}}>
            <video playsInline autoPlay ref={ref} style={{width: "250px", border: "2px solid #00ff00", borderRadius: "10px"}} />
            <p style={{position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 5px", margin: 0}}>User</p>
        </div>
    );
}

function App() {
    const [peers, setPeers] = useState([]);
    const [roomID, setRoomID] = useState("");
    const [joined, setJoined] = useState(false);
    const userVideoRef = useRef();
    const peersRef = useRef([]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = stream;
            }

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

            socket.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })
                setPeers(users => [...users, peer]);
            });

            socket.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        });
        // eslint-disable-next-line
    }, []);

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
                <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
                    <div style={{margin: "10px", position: "relative"}}>
                        <video muted ref={userVideoRef} autoPlay playsInline style={{width: "250px", border: "2px solid #61dafb", borderRadius: "10px"}} />
                        <p style={{position: "absolute", bottom: "10px", left: "10px", background: "black", margin: 0, padding: "2px 5px"}}>Me</p>
                    </div>

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