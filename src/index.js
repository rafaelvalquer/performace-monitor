// index.js
const { createServer } = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "..", "logs", "performance_logs.txt");

// Função para salvar logs no arquivo
function logToFile(data) {
  const logEntry = `${new Date().toISOString()} - Method: ${data.method}, Response Time: ${data.responseTime}ms, URL: ${data.url}, Status Code: ${data.statusCode} \n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error("Failed to write log:", err);
    }
  });
}

// Configuração do servidor WebSocket para receber dados da aplicação principal
const server = createServer();
const io = new Server(server, { cors: { origin: "*" } });

io.listen(3003); // Porta WebSocket para comunicação com a aplicação principal

// Escuta eventos de 'updateGraph' da aplicação principal
io.on("connection", (socket) => {
  console.log("Connected to main application via WebSocket");

  // Recebe dados de tempo de resposta via socket da aplicação principal
  socket.on("updateGraph", (data) => {
    const { method, responseTime, url, statusCode } = data;

    // Salva o log com os dados recebidos
    logToFile(data);

    // Emite os dados para qualquer cliente conectado (como `ui.js`)
    io.emit("updateGraph", data);
  });
});

console.log("Log collection server running on port 3003");
