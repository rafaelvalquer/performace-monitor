const { randomUUID } = require('crypto');
  
function route(target, { kind, name }) {
    if (kind !== 'method') return target;
  
    return async function (request, response) {
    const { statusCode, message } = await target.apply(this, [request, response]);
  
    response.writeHead(statusCode);
    response.end(JSON.stringify(message));
  };
  }

const isUiDisabled = process.env.UI_DISABLED;
let ui;
  if (isUiDisabled) {
    ui = {
      updateGraph: () => {}
  };
  } else {
  const Ui = require('./ui');
  ui = new Ui();
  }
  
  const log = (...args) => {
  if (isUiDisabled) console.log(...args);
};

// Variáveis acumuladoras
let totalResponseTime = {
  GET: 0,
  POST: 0,
};
let transactionCount = {
  GET: 0,
  POST: 0,
};

// Intervalo para calcular a média a cada 2 segundos
setInterval(() => {
  ['GET', 'POST'].forEach((method) => {
    if (transactionCount[method] > 0) {
      // Calcula a média
      const avgResponseTime = totalResponseTime[method] / transactionCount[method];
      
      // Atualiza o gráfico com a média
      ui.updateGraph(method, avgResponseTime);

      // Reseta os acumuladores para o próximo intervalo de 5 segundos
      totalResponseTime[method] = 0;
      transactionCount[method] = 0;
    }
  });
}, 2000); // 2000 ms = 2 segundos

function responseTimeTracker(target, { kind, name }) {
    if (kind !== 'method') return target;
  
    return function (request, response) {
    const reqId = randomUUID();
    const requestStartedAt = performance.now();

    const afterExecution = target.apply(this, [request, response]);
      const data = {
        reqId,
        name,
        method: request.method,
      url: request.url,
    };
  
      const onFinally = onRequestEnded({
        data,
        response,
        requestStartedAt,
    });
  
    // Assume que sempre será um objeto de promessa
    afterExecution.finally(onFinally);
    return afterExecution;
  };
  }
  
function onRequestEnded({ data, response, requestStartedAt }) {
    return () => {
    const requestEndedAt = performance.now();
    const timeDiff = requestEndedAt - requestStartedAt;
  
      data.statusCode = response.statusCode
    data.statusCode = response.statusCode;
    data.statusMessage = response.statusMessage;
    data.elapsed = timeDiff.toFixed(2).concat('ms');
    log('benchmark', data);

    // Acumula o tempo de resposta e incrementa o contador
    totalResponseTime[data.method] += timeDiff;
    transactionCount[data.method] += 1;
  };
}
module.exports = {
  route,
  responseTimeTracker,
};