import express from "express";
import client from "prom-client";

// Create a Registry to register the metrics
const register = new client.Registry();

export const getBlockNumberLatency = new client.Histogram({
  name: "evm_getBlockNumber_response_latency_ms",
  help: "_",
  labelNames: ["type"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

// Define latency histograms
export const blockRespLatency = new client.Histogram({
  name: "evm_block_response_latency_ms",
  help: "_",
  labelNames: ["type"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

export const logsByBlockNumberLatency = new client.Histogram({
  name: "evm_logs_by_block_number_latency_ms",
  help: "_",
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

register.registerMetric(getBlockNumberLatency);
register.registerMetric(blockRespLatency);
register.registerMetric(logsByBlockNumberLatency);

// Start the metrics server
export function startMetricsServer(port = 3000) {
  const app = express();
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });
  app.listen(port, () => {
    console.log(`Metrics server listening on http://localhost:${port}/metrics`);
  });
}
