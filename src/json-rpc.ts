import type { BlockPayload } from "./types/block";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any[];
  id: number | string;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: "2.0";
  id: number | string;
  latency: number; // Optional latency field for performance tracking
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JsonRpcError {
  code: number | null;
  message: string | null;
  fullResponse: any | null;
  latency: number;
  httpStatus: number;
  httpStatusText: string;
}

export class EthereumJsonRpc {
  private url: string;
  private idCounter = 1;

  constructor(url: string) {
    this.url = url;
  }

  async request<T = any>(
    method: string,
    params: any[] = []
  ): Promise<[JsonRpcError | null, JsonRpcResponse<T>]> {
    const body: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.idCounter++,
    };

    const startTime = Date.now();

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const latency = Date.now() - startTime;

    let jsonError: JsonRpcError | null = null;

    if (!res.ok || res.status !== 200) {
      jsonError = {
        code: null,
        message: null,
        fullResponse: null,
        latency,
        httpStatus: res.status,
        httpStatusText: res.statusText,
      };

      return [jsonError, { jsonrpc: "2.0", id: body.id, latency }];
    }

    const data: JsonRpcResponse<T> = await res.json();

    if (!data) {
      jsonError = {
        code: null,
        message: null,
        fullResponse: null,
        latency,
        httpStatus: res.status,
        httpStatusText: res.statusText,
      };
    }

    if (!data || data.jsonrpc !== "2.0") {
      jsonError = {
        code: null,
        message: null,
        fullResponse: data,
        latency,
        httpStatus: res.status,
        httpStatusText: res.statusText,
      };
    }
    if (data.error) {
      jsonError = {
        code: data.error.code,
        message: data.error.message,
        fullResponse: data,
        latency,
        httpStatus: res.status,
        httpStatusText: res.statusText,
      };
    }

    if (!data.result) {
      jsonError = {
        code: null,
        message: null,
        fullResponse: data,
        latency,
        httpStatus: res.status,
        httpStatusText: res.statusText,
      };
    }

    if (data.result == null) {
      jsonError = {
        code: null,
        message: null,
        fullResponse: data,
        latency,
        httpStatus: res.status,
        httpStatusText: res.statusText,
      };
    }

    return [
      jsonError,
      {
        ...data,
        latency, // Add latency to the response
      },
    ];
  }

  // Common Ethereum JSON-RPC methods
  async eth_blockNumber() {
    return this.request<string>("eth_blockNumber");
  }

  async eth_getBlockByNumber(options: {
    blockNumber: string;
    fullTx?: boolean;
  }): Promise<[JsonRpcError | null, JsonRpcResponse<BlockPayload>]> {
    const { blockNumber, fullTx = false } = options;
    return this.request("eth_getBlockByNumber", [blockNumber, fullTx]);
  }

  async eth_getBalance(options: { address: string; block?: string }) {
    const { address, block = "latest" } = options;
    return this.request("eth_getBalance", [address, block]);
  }

  async eth_call(options: { callObj: any; block?: string }) {
    const { callObj, block = "latest" } = options;
    return this.request("eth_call", [callObj, block]);
  }

  async net_version() {
    return this.request<string>("net_version");
  }

  /**
   * Get logs with all possible filter params.
   * @param options Object with optional fields: fromBlock, toBlock, address, topics, blockhash
   */
  async eth_getLogs(options: {
    fromBlock?: string;
    toBlock?: string;
    address?: string | string[];
    topics?: (string | string[] | null)[];
    blockHash?: string;
  }) {
    // Only include defined fields in the filter
    const filter: any = {};
    if (options.fromBlock) filter.fromBlock = options.fromBlock;
    if (options.toBlock) filter.toBlock = options.toBlock;
    if (options.address) filter.address = options.address;
    if (options.topics) filter.topics = options.topics;
    if (options.blockHash) filter.blockHash = options.blockHash;
    return this.request("eth_getLogs", [filter]);
  }

  async trace_transaction(txHash: string) {
    return this.request("trace_transaction", [[txHash]]);
  }

  async trace_block(blockHashOrNumber: string) {
    return this.request("trace_block", [blockHashOrNumber]);
  }

  async eth_getTransactionReceipt(options: { txHash: string }) {
    return this.request("eth_getTransactionReceipt", [options.txHash]);
  }

  async eth_getTransactionByHash(options: { txHash: string }) {
    return this.request("eth_getTransactionByHash", [options.txHash]);
  }

  async eth_getTransactionByBlockNumberAndIndex(options: {
    blockNumber: string;
    index: string;
  }) {
    return this.request("eth_getTransactionByBlockNumberAndIndex", [
      options.blockNumber,
      options.index,
    ]);
  }

  async eth_getTransactionCount(options: { address: string; block?: string }) {
    const { address, block = "latest" } = options;
    return this.request("eth_getTransactionCount", [address, block]);
  }

  async eth_sendRawTransaction(options: { rawTx: string }) {
    return this.request("eth_sendRawTransaction", [options.rawTx]);
  }

  async eth_gasPrice() {
    return this.request("eth_gasPrice");
  }

  async eth_estimateGas(options: { txObject: any }) {
    return this.request("eth_estimateGas", [options.txObject]);
  }

  async eth_chainId() {
    return this.request("eth_chainId");
  }

  async web3_clientVersion() {
    return this.request("web3_clientVersion");
  }

  async eth_syncing() {
    return this.request("eth_syncing");
  }

  async eth_getCode(options: { address: string; block?: string }) {
    const { address, block = "latest" } = options;
    return this.request("eth_getCode", [address, block]);
  }

  // Add more helpers as needed
}
