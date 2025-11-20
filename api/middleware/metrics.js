const client = require('prom-client');

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
  labelNames: ['method', 'route', 'status'],
});

function metricsMiddleware(req, res, next) {
  const routeLabel = req.route?.path || req.originalUrl;
  const endTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = { method: req.method, route: routeLabel, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
}

async function metricsHandler(_req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler };
