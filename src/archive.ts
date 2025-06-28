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

const NUMBER_OF_SEGMENTS = 10;

export async function archiveBench(rpcUrl: string) {
  startMetricsServer(3000); // Start metrics endpoint
  const rpc = new EthereumJsonRpc(rpcUrl);

  // 1. Get the highest block number
  const [blockNumberErr, blockNumberResp] = await rpc.eth_blockNumber();

  if (blockNumberErr || !blockNumberResp.result) {
    console.error("Error getting block by number:", blockNumberErr);
  }

  const blockNumberHex = blockNumberResp.result!;
  if (!blockNumberHex) {
    console.log("No block number returned");
  }

  const blockNumber = parseInt(blockNumberHex, 16);

  const segments = blockNumber / NUMBER_OF_SEGMENTS;

  for (let i = 1; i <= NUMBER_OF_SEGMENTS; i++) {
    const blockNumberToFetch = Math.floor(i * segments);
    const blockNumberHex = "0x" + blockNumberToFetch.toString(16);

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
    }
    if (blockErr) {
      console.error("Error getting block by number:", blockErr);
    }

    if (!blockFullTxResp.result || !blockResp.result) {
      console.error("Block response is empty");
    }

    // Ensure blockFullTxResp.result is defined before accessing .hash
    if (!blockFullTxResp.result) {
      console.error(
        "blockFullTxResp.result is undefined, skipping logs by block hash"
      );
      continue;
    }

    const [logsByBlockNumberErr, logsByBlockNumberResp] = await rpc.eth_getLogs(
      {
        fromBlock: blockNumberHex,
        toBlock: blockNumberHex,
      }
    );

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

    const logsValid = validateLogsTransactionHashesInBlock(logsByNumber, block);

    const logsValidHash = validateLogsTransactionHashesInBlock(
      logsByHash,
      block
    );

    console.log(logsValid, blockNumberToFetch);

    console.log(logsValidHash, blockNumberToFetch);

    if (!logsValid.valid) {
      console.error("Logs validation failed:", logsValid.errors);
      continue;
    }
    if (!logsValidHash.valid) {
      console.error("Logs validation failed:", logsValidHash.errors);
      continue;
    }
  }
}
