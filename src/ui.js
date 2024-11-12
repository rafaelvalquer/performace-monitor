// ui.js
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

  // Configuração do log de servidor
  log = contrib.log({ 
    fg: "green", 
    selectedFg: "green", 
    label: "Server Log",
    width: "100%",
    height: "30%",
    top: "50%",
    left: "0%",
    border: { type: "line", fg: "cyan" },
   });

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
    this.screen.append(this.log);
    this.renderGraph();

    // Escuta os dados de tempo de resposta via WebSocket
    socket.on("updateGraph", (data) => {
      this.updateGraph(data.method, data.responseTime, data.url, data.statusCode);
    });

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

    // Incrementa o valor correspondente no stackedData com base no statusCode
    if ((statusCode === 200 || statusCode === 201) && value < 4000) {
      this.stackedData[method][0] += 1; // Verde
    } else if (value > 4000) {
      this.stackedData[method][1] += 1; // Amarelo
    } else {
      this.stackedData[method][2] += 1; // Vermelho
    }

    // Atualiza o gráfico de barras empilhadas com a cor e valores conforme o statusCode
    this.renderStackedBar();
    this.renderGraph();

    // Adiciona uma nova entrada no log
    this.log.log(`${method} ${url} | Response Time: ${value}ms | Status Code: ${statusCode}`);
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
}

const ui = new Ui();
