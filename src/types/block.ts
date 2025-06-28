export interface BlockPayload {
  baseFeePerGas: string;
  blobGasUsed: string;
  difficulty: string;
  excessBlobGas: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentBeaconBlockRoot: string;
  parentHash: string;
  receiptsRoot: string;
  requestsHash: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  transactions: any[];
  transactionsRoot: string;
  uncles: any[];
  withdrawals: any[];
  withdrawalsRoot: string;
}
