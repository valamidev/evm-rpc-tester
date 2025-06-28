import { log } from "console";
import { EthereumJsonRpc } from "./json-rpc";
import {
  validateLogsAgainstBloom,
  validateLogsTransactionHashesInBlock,
} from "./validators/eth_getLogs";
import {
  startMetricsServer,
  blockRespLatency,
  logsByBlockNumberLatency,
  getBlockNumberLatency,
} from "./metrics";

export async function realTimeBench(rpcUrl: string) {
  startMetricsServer(3000); // Start metrics endpoint
  const rpc = new EthereumJsonRpc(rpcUrl);

  let highestBlockNumber = 0;

  while (true) {
    try {
      await new Promise((res) => setTimeout(res, 200));

      // 1. Get the highest block number
      const [blockNumberErr, blockNumberResp] = await rpc.eth_blockNumber();

      if (blockNumberErr) {
        console.error("Error getting block by number:", blockNumberErr);
        continue;
      }

      const blockNumberHex = blockNumberResp.result;
      if (!blockNumberHex) {
        console.log("No block number returned");
        continue;
      }

      const blockNumber = parseInt(blockNumberHex, 16);

      if (blockNumber === highestBlockNumber) {
        continue;
      }

      if (blockNumber > highestBlockNumber) {
        highestBlockNumber = blockNumber;
        console.log(`Highest block: ${blockNumber} (hex: ${blockNumberHex})`);
      } else {
        console.log(
          `Backward blockHeight detected (re-org): ${blockNumber} <-- ${highestBlockNumber}, diff: -${
            highestBlockNumber - blockNumber
          }`
        );
        continue;
      }

      // 2. Get the block by number (to get block hash)
      const [blockFullTxErr, blockFullTxResp] = await rpc.eth_getBlockByNumber({
        blockNumber: blockNumberHex,
        fullTx: true,
      });

      const [blockErr, blockResp] = await rpc.eth_getBlockByNumber({
        blockNumber: blockNumberHex,
        fullTx: false,
      });

      if (blockFullTxErr) {
        console.error("Error getting full block by number:", blockFullTxErr);
        continue;
      }
      if (blockErr) {
        console.error("Error getting block by number:", blockErr);
        continue;
      }

      if (!blockFullTxResp.result || !blockResp.result) {
        console.error("Block response is empty");
        continue;
      }

      const [logsByBlockNumberErr, logsByBlockNumberResp] =
        await rpc.eth_getLogs({
          fromBlock: blockNumberHex,
          toBlock: blockNumberHex,
        });

      const [logsByBlockHashErr, logsByBlockHashResp] = await rpc.eth_getLogs({
        blockHash: blockFullTxResp.result.hash,
      });

      if (logsByBlockNumberErr) {
        console.error(
          "Error getting logs by block number:",
          logsByBlockNumberErr
        );
        continue;
      }
      if (logsByBlockHashErr) {
        console.error("Error getting logs by block hash:", logsByBlockHashErr);
        continue;
      }

      const logsByNumber = logsByBlockNumberResp.result;
      const logsByHash = logsByBlockHashResp.result;
      const block = blockFullTxResp.result;

      const logsValid = validateLogsTransactionHashesInBlock(
        logsByNumber,
        block
      );

      const logsValidHash = validateLogsTransactionHashesInBlock(
        logsByHash,
        block
      );

      if (!logsValid.valid) {
        console.error("Logs validation failed:", logsValid.errors);
        continue;
      }

      if (!logsValidHash.valid) {
        console.error("Logs validation failed:", logsValidHash.errors);
        continue;
      }

      // Record latencies in Prometheus histograms
      getBlockNumberLatency.observe(blockNumberResp.latency);
      blockRespLatency.labels("fullTx_false").observe(blockResp.latency);
      blockRespLatency.labels("fullTx_true").observe(blockFullTxResp.latency);
      logsByBlockNumberLatency.observe(logsByBlockNumberResp.latency);
    } catch (err) {
      console.error("Error in test bench:", err);
    }
    // Wait 5 seconds before next iteration
    await new Promise((res) => setTimeout(res, 500));
  }
}
