import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io.connect("http://localhost:5000");

function App() {
	const [ me, setMe ] = useState("");
	const [ stream, setStream ] = useState();
	const [ receivingCall, setReceivingCall ] = useState(false);
	const [ caller, setCaller ] = useState("");
	const [ callerSignal, setCallerSignal ] = useState();
	const [ callAccepted, setCallAccepted ] = useState(false);
	const [ idToCall, setIdToCall ] = useState("");
	const [ callEnded, setCallEnded ] = useState(false);
	const [ name, setName ] = useState("");

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
		const peer = new Peer({ initiator: true, trickle: false, stream: stream });

		peer.on("signal", (data) => {
			socket.emit("callUser", {
				userToCall: id,
				signalData: data,
				from: me,
				name: name
			});
		});

		peer.on("stream", (stream) => {
			if (userVideo.current) {
				userVideo.current.srcObject = stream;
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
		const peer = new Peer({ initiator: false, trickle: false, stream: stream });

		peer.on("signal", (data) => {
			socket.emit("answerCall", { signal: data, to: caller });
		});

		peer.on("stream", (stream) => {
			if (userVideo.current) {
				userVideo.current.srcObject = stream;
			}
		});

		peer.signal(callerSignal);
		connectionRef.current = peer;
	};

	const leaveCall = () => {
		setCallEnded(true);
		connectionRef.current.destroy();
	};

	return (
		<div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
			<h1 style={{ color: "#4a90e2" }}>AZ_chat</h1>
			
			<div className="container" style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
				
				{/* My Video */}
				<div className="video">
					<h3>My Video</h3>
					<video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", border: "5px solid #007bff" }} />
				</div>

				{/* User Video */}
				<div className="video">
					{callAccepted && !callEnded ? (
						<>
						<h3>User Video</h3>
						<video playsInline ref={userVideo} autoPlay style={{ width: "300px", border: "5px solid #28a745" }} />
						</>
					) : null}
				</div>
			</div>

			<div className="myId" style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc" }}>
				<h3>My ID: {me}</h3>
				
				<input
					type="text"
					placeholder="Enter ID to call"
					value={idToCall}
					onChange={(e) => setIdToCall(e.target.value)}
					style={{ padding: "10px", width: "300px" }}
				/>
				<br /><br />
				
				{callAccepted && !callEnded ? (
					<button onClick={leaveCall} style={{ backgroundColor: "red", color: "white", padding: "10px 20px" }}>End Call</button>
				) : (
					<button onClick={() => callUser(idToCall)} style={{ backgroundColor: "blue", color: "white", padding: "10px 20px" }}>Call User</button>
				)}
			</div>

			{receivingCall && !callAccepted ? (
				<div className="caller" style={{ marginTop: "20px", background: "#f0f0f0", padding: "10px" }}>
					<h1>Someone is calling...</h1>
					<button onClick={answerCall} style={{ backgroundColor: "green", color: "white", padding: "10px 20px" }}>
						Answer
					</button>
				</div>
			) : null}
		</div>
	);
}

export default App;