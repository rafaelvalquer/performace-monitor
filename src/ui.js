// ui.js
const blessed = require("blessed");
const contrib = require("blessed-contrib");
const { io } = require("socket.io-client");

// Conexão com o servidor WebSocket de `index.js` para receber dados
const socket = io("http://localhost:3003");

// Configuração da interface gráfica
const screen = blessed.screen();

// Função para criar uma lista vazia
const creatEmptyList = (length, val) =>
  Array.from({ length }, () => val);

const getEmptyCoordinates = () => ({
  x: creatEmptyList(50, " "),
  y: creatEmptyList(50, 1),
});

class Ui {
  line = contrib.line({
    label: "Response Time (MS)",
    showLegend: true,
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

  constructor() {
    this.screen = screen;
    this.screen.append(this.line);
    this.renderGraph();

    // Escuta os dados de tempo de resposta via WebSocket
    socket.on("updateGraph", (data) => {
      this.updateGraph(data.method, data.responseTime);
    });
  }

  renderGraph() {
    this.line.setData([this.getRequest, this.postRequest]);
    this.screen.render();
  }

  updateGraph(method, value) {
    const target = method === "GET" ? this.getRequest : this.postRequest;

    target.y.shift();
    target.y.push(value);

    this.renderGraph();
  }
}

const ui = new Ui();
