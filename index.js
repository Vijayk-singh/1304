const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

const users = {};

const chatHistory = {};
//server stablization
io.on("connection", (socket) => {

    //set new user to userlist
  socket.on("setUsername", (username) => {
    if (username && !users[username]) {
      users[username] = socket;
      socket.username = username;
      console.log(`User connected with username: ${username}`);
      io.emit("userList", Object.keys(users));
      if (chatHistory[username]) {
        io.emit('chatHistory', chatHistory[username]);
      }
    } else {
      // Inform client that username is already taken (handle as needed)
      socket.emit("usernameError", "Username is already taken");
    }
  });

  //private message one to one
  socket.on("privateMessage", ({ recipient, message }) => {
    const sender = socket.username;

    if (users[recipient]) {
      // Send the message only to the specified recipient
      users[recipient].emit("privateMessage", { sender, message });
      if (!chatHistory[sender]) {
        chatHistory[sender] = [];
      }
      chatHistory[sender].push({ sender,recipient, message});
    
      // messages[sender] = { to: recipient, message: message };
    } else {
      // Inform sender that recipient is not found (handle as needed)
      socket.emit("recipientError", "Recipient not found");
    }
  });

  //get userchat history
  socket.on("getChatHistory",(data)=>{
    const {user}=data;
    const userChatHistory = chatHistory[user] ||[];
    socket.emit('chatHistory' , userChatHistory);
  })

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
  // Handle disconnection
  socket.on("disconnect", () => {
    const username = socket.username;
    if (username) {
      console.log(`User disconnected: ${username}`);
      delete users[username]; // Remove user from users object on disconnection

      // Emit updated user list to all clients
      io.emit("userList", Object.keys(users));
    }
  });
});
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
