const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

// Yahan hum sabke naam store karenge
// Format: { socketID: "Naam" }
let users = {}; 

io.on("connection", (socket) => {
	
	// Jab koi naya banda apna naam bataye
	socket.on("joinRoom", (name) => {
		users[socket.id] = name; // Save name
		
		// Sabko nayi list bhejo
		io.emit("allUsers", users); 
	});

	socket.on("disconnect", () => {
		delete users[socket.id]; // List se hatao
		io.emit("allUsers", users); // Updated list sabko bhejo
		socket.broadcast.emit("callEnded");
	});

	socket.on("callUser", (data) => {
		io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal);
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));