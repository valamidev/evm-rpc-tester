import { Buffer } from "buffer";
import { toBytes, isHex } from "viem";

function isInBloom(logsBloom: string, value: string): boolean {
  const bloom = Buffer.from(logsBloom.replace(/^0x/, ""), "hex");
  let valBytes: Uint8Array;
  try {
    valBytes = isHex(value) ? toBytes(value) : toBytes("0x" + value);
  } catch {
    return false;
  }
  if (valBytes.length < 6) return false;
  const v0 = valBytes[0],
    v1 = valBytes[1],
    v2 = valBytes[2],
    v3 = valBytes[3],
    v4 = valBytes[4],
    v5 = valBytes[5];
  if (
    v0 === undefined ||
    v1 === undefined ||
    v2 === undefined ||
    v3 === undefined ||
    v4 === undefined ||
    v5 === undefined
  ) {
    return false;
  }
  const bitpos = [
    ((v0 & 0x7) << 8) | v1,
    ((v2 & 0x7) << 8) | v3,
    ((v4 & 0x7) << 8) | v5,
  ];
  return bitpos.every((pos) => {
    const byteIndex = 256 - 1 - Math.floor(pos / 8);
    if (byteIndex < 0 || byteIndex >= bloom.length) return false;
    const bitMask = 1 << pos % 8;
    const bloomByte = bloom[byteIndex];
    if (bloomByte === undefined) return false;
    return (bloomByte & bitMask) !== 0;
  });
}

export function validateLogsAgainstBloom(logs: any[], logsBloom: string) {
  let inBloom = 0;

  for (const [i, log] of logs.entries()) {
    if (isInBloom(logsBloom, log.address)) {
      inBloom++;
    }
  }
  return { logsCount: logs.length, inBloom, missing: logs.length - inBloom };
}

export function validateLogsTransactionHashesInBlock(logs: any[], block: any) {
  const errors: string[] = [];

  const txHashes = Array.isArray(block.transactions)
    ? block.transactions.map((tx: any) =>
        typeof tx === "string" ? tx : tx.hash
      )
    : [];

  if (
    logs.length === 0 &&
    block.logsBloom.slice(0, 95) !==
      "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  ) {
    return {
      valid: false,
      reason: "No logs in block and logsBloom is not empty",
      errors,
      logsCount: logs.length,
      txHashesCount: txHashes.length,
      errorsCount: errors.length,
    };
  }

  // Support both array of hashes and array of tx objects

  for (const [i, log] of logs.entries()) {
    if (!log.transactionHash || !txHashes.includes(log.transactionHash)) {
      errors.push(
        `Log #${i} transactionHash ${log.transactionHash} not found in block.transactions`
      );
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    logsCount: logs.length,
    txHashesCount: txHashes.length,
    errorsCount: errors.length,
  };
}
