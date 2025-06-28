import dotenv from "dotenv";
import { realTimeBench } from "./realtime";
import { archiveBench } from "./archive";

dotenv.config();

// Could be used to disable TLS verification for testing purposes
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const rpcUrl = process.env.RPC_URL;
if (typeof rpcUrl !== "string" || !rpcUrl) {
  throw new Error("RPC_URL must be set in .env and must be a string");
}

const args = process.argv.slice(2);

if (args.includes("--realtime")) {
  console.log("Realtime mode enabled");
  // You can add your realtime logic here, e.g., polling blockNumber

  await realTimeBench(rpcUrl);
}

if (args.includes("--archive")) {
  console.log("Archive mode enabled");
  await archiveBench(rpcUrl);
}
