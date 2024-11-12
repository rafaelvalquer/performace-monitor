// ui.js
const pm2 = require("pm2"); // Importação do módulo PM2
const blessed = require("blessed");
const contrib = require("blessed-contrib");
const { io } = require("socket.io-client");

// Conexão com o servidor WebSocket de `index.js` para receber dados
const socket = io("http://localhost:3003");

// Configuração da interface gráfica
const screen = blessed.screen();

// Função para criar uma lista vazia
const creatEmptyList = (length, val) => Array.from({ length }, () => val);

const getEmptyCoordinates = () => ({
  x: creatEmptyList(50, " "),
  y: creatEmptyList(50, 1),
});

class Ui {
  // Configuração do gráfico de linhas
  line = contrib.line({
    label: "Response Time (MS)",
    showLegend: true,
    width: "80%",
    height: "50%",
    top: 0,
    left: "0%",
    border: { type: "line", fg: "cyan" },
  });

  // Configuração do gráfico de barras empilhadas
  stackedBar = contrib.stackedBar({
    label: "Status Code Chart",
    barWidth: 4,
    barSpacing: 6,
    xOffset: 0,
    maxHeight: 10,
    width: "20%",
    height: "50%",
    top: 0,
    left: "80%",
    border: { type: "line", fg: "cyan" },
  });

  // Caixa de monitoramento de serviços PM2
  pm2Box = blessed.box({
    label: "PM2 Services",
    width: "30%",
    height: "50%",
    top: "50%",
    left: "70%",
    border: { type: "line", fg: "cyan" },
    scrollable: true,
    alwaysScroll: true,
    tags: true, // Ativa suporte para tags de cor
    scrollbar: {
      ch: " ",
      inverse: true,
    },
  });
  

  // Lista de logs personalizada com suporte para cores
  logBox = blessed.box({
    label: "Server Log",
    width: "70%",
    height: "30%",
    top: "50%",
    left: "0%",
    border: { type: "line", fg: "cyan" },
    scrollable: true,
    alwaysScroll: true,
    tags: true, // Ativa suporte para tags de cor
    scrollbar: {
      ch: " ",
      inverse: true,
    },
  });

  // Armazena os dados de logs e cores
  logs = [];

  getRequest = {
    ...getEmptyCoordinates(),
    title: "GET /people",
    style: {
      line: "yellow",
    },
  };

  postRequest = {
    ...getEmptyCoordinates(),
    title: "POST /people",
    style: {
      line: "green",
    },
  };

  // Armazena os dados da barra empilhada
  stackedData = {
    GET: [0, 0, 0],
    POST: [0, 0, 0],
  };

  constructor() {
    this.screen = screen;
    this.screen.append(this.line);
    this.screen.append(this.stackedBar);
    this.screen.append(this.logBox);
    this.screen.append(this.pm2Box);

    this.renderGraph();

    // Escuta os dados de tempo de resposta via WebSocket
    socket.on("updateGraph", (data) => {
      this.updateGraph(data.method, data.responseTime, data.url, data.statusCode);
    });

    // Inicia a atualização periódica dos serviços PM2
    this.updatePm2Services();

    // Renderiza o gráfico de barras empilhadas inicial
    this.renderStackedBar();
  }

  renderGraph() {
    this.line.setData([this.getRequest, this.postRequest]);
    this.screen.render();
  }

  updateGraph(method, value, url, statusCode) {
    const target = method === "GET" ? this.getRequest : this.postRequest;
  
    target.y.shift();
    target.y.push(value);
  
    // Limita a string do URL aos primeiros 25 caracteres
    const shortenedUrl = url.slice(7, 48);
  
    // Incrementa o valor correspondente no stackedData com base no statusCode
    if ((statusCode === 200 || statusCode === 201) && value < 4000) {
      this.stackedData[method][0] += 1; // Verde
      this.addLogLine(`${method} ${shortenedUrl} | Response Time: ${value}ms | Status Code: ${statusCode}`, "green");
    } else if (value > 4000) {
      this.stackedData[method][1] += 1; // Amarelo
      this.addLogLine(`${method} ${shortenedUrl} | Response Time: ${value}ms | Status Code: Timeout`, "yellow");
    } else {
      this.stackedData[method][2] += 1; // Vermelho
      this.addLogLine(`${method} ${shortenedUrl} | Response Time: ${value}ms | Status Code: Error`, "red");
    }
  
    // Atualiza o gráfico de barras empilhadas com a cor e valores conforme o statusCode
    this.renderStackedBar();
    this.renderGraph();
  }
  

  renderStackedBar() {
    // Atualiza o gráfico de barras empilhadas com as cores e valores
    this.stackedBar.options.barBgColor = ["green", "yellow", "red"];
    this.stackedBar.setData({
      barCategory: ["GET", "POST"], // Títulos de cada barra empilhada
      stackedCategory: ["200", "Timeout", "Other"], // Categorias empilhadas
      data: [
        this.stackedData["GET"], // Valores de GET [verde, amarelo, vermelho]
        this.stackedData["POST"], // Valores de POST [verde, amarelo, vermelho]
      ],
    });

    this.screen.render();
  }

  addLogLine(text, color) {
    // Adiciona linha ao log com a cor formatada
    const line = `{${color}-fg}${text}{/${color}-fg}`;
    this.logs.push(line);

    // Limita o número de logs para exibição
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    this.logBox.setContent(this.logs.join("\n"));
    this.logBox.setScrollPerc(100); // Rola automaticamente para a última linha
    this.screen.render();
  }

  // Atualiza a lista de serviços PM2 na interface
  updatePm2Services() {
    setInterval(() => {
      pm2.list((err, list) => {
        if (err) {
          console.error('Erro ao listar processos PM2:', err);
          return;
        }

        const pm2Statuses = list.map((proc) => {
          const serviceName = proc.name;
          if (serviceName.includes('refresh')) {
            return `{yellow-fg}Ignorado: ${serviceName}{/yellow-fg}`;
          }
          const statusColor = proc.pm2_env.status === 'online' ? 'green' : 'red';
          return `{${statusColor}-fg}${serviceName}: ${proc.pm2_env.status}{/${statusColor}-fg}`;
        });

        this.pm2Box.setContent(pm2Statuses.join("\n"));
        this.screen.render();
      });
    }, 5000); // Atualiza a cada 5 segundos
  }
}

const ui = new Ui();
