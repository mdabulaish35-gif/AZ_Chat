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

// Yahan hum sabki Custom IDs store karenge (Phonebook)
const users = {}; 

io.on("connection", (socket) => {
	
	// Jab user apna Custom ID bheje
	socket.on("setCustomId", (customId) => {
		users[customId] = socket.id; // Map Custom ID to Socket ID
		socket.emit("me", customId); // User ko confirm karo
		console.log(`User Registered: ${customId}`);
	});

	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded");
		// Optional: Delete user from list on disconnect (logic can be added)
	});

	socket.on("callUser", (data) => {
		const socketIdToCall = users[data.userToCall]; 

		if (socketIdToCall) {
			io.to(socketIdToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
		} else {
            // Naya: Agar user na mile toh wapas batao
			socket.emit("noUserFound");
		}
	});

	socket.on("answerCall", (data) => {
		// Answer karte waqt bhi ID dhoondo
		const socketIdToAnswer = users[data.to];
		if (socketIdToAnswer) {
			io.to(socketIdToAnswer).emit("callAccepted", data.signal);
		}
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));