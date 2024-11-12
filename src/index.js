// index.js
const { createServer } = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

// Diretório dos logs
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Variáveis globais para controlar a rotação de logs
let currentHour = new Date().getHours();
let currentLogFilePath = path.join(logsDir, "performance_logs.txt");

// Função para rotacionar o log
function rotateLog() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:T]/g, "-").split(".")[0];
  const rotatedLogPath = path.join(
    logsDir,
    `performance_logs_${timestamp}.txt`
  );

  // Renomeia o arquivo atual com o timestamp
  fs.rename(currentLogFilePath, rotatedLogPath, (err) => {
    if (err) console.error("Error rotating log file:", err);
  });

  // Atualiza o caminho do arquivo atual e reseta o log para a nova hora
  currentLogFilePath = path.join(logsDir, "performance_logs.txt");
  currentHour = now.getHours();
}

// Função para formatar a data no padrão desejado
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// Função para salvar logs no arquivo
function logToFile(data) {
  const now = new Date();
  const logEntry = `${formatDate(now)} - Method: ${data.method}, Response Time: ${data.responseTime}ms, URL: ${data.url}, Status Code: ${data.statusCode} \n`;
  fs.appendFile(currentLogFilePath, logEntry, (err) => {
    if (err) {
      console.error("Failed to write log:", err);
    }
  });
}

// Verificação a cada 30 segundos para rotacionar o log
setInterval(() => {
  const now = new Date();
  if (now.getHours() !== currentHour) {
    rotateLog();
  }
}, 30000); // Verifica a cada 30 segundos

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

    if(responseTime > 4000){
      statusCode = 'TIMEOUT';
    }
    // Salva o log com os dados recebidos
    logToFile(data);

    // Emite os dados para qualquer cliente conectado (como `ui.js`)
    io.emit("updateGraph", data);
  });
});

console.log("Log collection server running on port 3003");
