import * as socketsIOServer from "socket.io";

const io = socketsIOServer(9090);
let logsUISocket: socketsIOServer.Socket;
let socketsLoggerSocket: socketsIOServer.Socket;
io.on("connection", (socket) => {
    if (socket.handshake.query.id === "SocketsLogger") {
        console.log("New Connection from SocketsLogger");
        if (socketsLoggerSocket) {
            socketsLoggerSocket.disconnect();
            socketsLoggerSocket = undefined;
        }
        socketsLoggerSocket = socket;
        socket.on("LOG", data => {
            console.log(data);
            if (logsUISocket) {
                logsUISocket.emit("LOG", data);
            }
        });
        socket.on("NEW-TEST", data => {
            if (logsUISocket) {
                logsUISocket.emit("NEW-TEST", data);
            }
        });
    }

    if (socket.handshake.query.id === "LogsUI") {
        console.log("New Connection from LogsUI");
        logsUISocket = socket;
    }
});
