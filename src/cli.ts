/* eslint-disable @typescript-eslint/no-explicit-any */
import yargs from "yargs";
import chalk from "chalk";
import { connect, keyStores, Account } from "near-api-js";
import os from "os";
import path from "path";
import util from "util";
import dotenv from "dotenv";
import { FormData, fileFromPath } from "formdata-node";
import { Readable } from "stream";
import { Encoder } from "form-data-encoder";

console.info = function () {
  // noop
};

// const FormDataNode = DefaultFormData.default;
const EPILOGUE = `This is a beta release of @textile/near-storage-cli. Do not store personal, encrypted, or illegal data.
Data will not be available permanently on either Filecoin or IPFS.
See the full terms of service (TOS) for details: https://near.storage/terms`;

import { init } from "@textile/near-storage";

dotenv.config();
const homedir = os.homedir();
const MergeKeyStore = keyStores.MergeKeyStore;
const UnencryptedFileSystemKeyStore = keyStores.UnencryptedFileSystemKeyStore;
const CREADS = process.env.CREDENTIALS_DIR || ".near-credentials";

interface Options {
  networkId: string;
  accountId: string;
  contractId: string;
  brokerId: string;
  brokerAddr: string;
}

interface Compiled extends Options {
  keyStore: keyStores.InMemoryKeyStore;
}

async function createAccount(options: Compiled) {
  const { networkId, accountId, keyStore } = options;
  if (networkId !== "testnet" && networkId !== "default") {
    throw console.log(
      chalk`{bold.white Currently only configured for [ {bold.blue testnet} ]...}`
    );
  }
  const keys = await keyStore.getKey(networkId, accountId);
  if (!keys) {
    throw console.log(
      chalk`{bold.white Unable to find [ {bold.blue ${networkId}} ] credentials for [ {bold.blue ${accountId}} ]...}`
    );
  }
  const near = await connect({
    ...options,
    deps: { keyStore },
    // TODO: Make these configurable
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
  });

  const account = await near.account(accountId);
  return account;
}

function createStorage(account: Account, options: Options) {
  const { contractId, brokerId, brokerAddr } = options;
  const brokerInfo =
    brokerId && brokerAddr ? { brokerId, addresses: [brokerAddr] } : undefined;
  return init(account, {
    brokerInfo,
    contractId,
  });
}

function createKeyStore() {
  // ./neardev is an old way of storing keys under project folder. We want to fallback there for backwards compatibility
  const credentialsPath = path.join(homedir, CREADS);
  const keyStores = [new UnencryptedFileSystemKeyStore(credentialsPath)];
  return { keyStore: new MergeKeyStore(keyStores) };
}

async function releaseDeposits(options: any) {
  const account = await createAccount(options);
  const storage = await createStorage(account, options);
  try {
    await storage.releaseDeposits();
    const res = util.inspect(true, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const release = {
  command: "release [accountId]",
  desc: "release deposits for all accounts",
  handler: releaseDeposits,
};

async function addDeposit(options: any) {
  const { accountId } = options;
  const account = await createAccount(options);
  const storage = await createStorage(account, options);
  try {
    const output = await storage.addDeposit(accountId);
    const res = util.inspect(output, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const add = {
  command: "deposit [accountId]",
  desc: "add deposit for account",
  handler: addDeposit,
};

async function listBrokers(options: any) {
  const account = await createAccount(options);
  const storage = await createStorage(account, options);
  try {
    const output = await storage.listBrokers();
    const res = util.inspect(output, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const list = {
  command: "list",
  desc: "list available brokers",
  handler: listBrokers,
};

async function hasDeposited(options: any) {
  const account = await createAccount(options);
  const storage = await createStorage(account, options);
  try {
    const output = await storage.hasDeposit();
    const res = util.inspect(output, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const has = {
  command: "has [accountId]",
  desc: "check if account has deposit",
  handler: hasDeposited,
};

async function getBroker(options: any) {
  const { brokerId } = options;
  const account = await createAccount(options);
  const storage = await createStorage(account, options);
  try {
    const output = await storage.getBroker(brokerId);
    const res = util.inspect(output, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const get = {
  command: "get <brokerId>",
  desc: "get information about a given broker",
  handler: getBroker,
};

async function storeFile(options: any) {
  const { filename } = options;
  const account = await createAccount(options);
  const storage = await createStorage(account, options);

  const fd = new FormData();
  fd.set("file", await fileFromPath(filename));
  const encoder = new Encoder(fd);

  try {
    const output = await storage.store(Readable.from(encoder), {
      headers: encoder.headers,
    });
    const res = util.inspect(output, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const store = {
  command: "store <filename>",
  desc: "push a file to a storage provider",
  handler: storeFile,
};

async function getStatus(options: any) {
  const { requestId } = options;
  const account = await createAccount(options);
  const storage = await createStorage(account, options);
  try {
    const output = await storage.status(requestId);
    const res = util.inspect(output, false, 2, true);
    console.log(res);
  } catch (err) {
    console.error(err.message);
  }
}

const status = {
  command: "status <requestId>",
  desc: "get information about the status of a storage request\nUnknown=0, Batching=1, Preparing=2, Auctioning=3, DealMaking=4, Success=4",
  handler: getStatus,
};

yargs(process.argv.slice(2))
  .strict()
  .scriptName("bridge")
  .option("accountId", {
    desc: "Unique identifier for the account",
    type: "string",
    default: process.env.ACCOUNT_ID || "",
  })
  .option("networkId", {
    desc: "NEAR network ID, allows using different keys based on network",
    type: "string",
    default: process.env.NEAR_NETWORK_ID || "testnet",
  })
  .option("brokerId", {
    desc: "The broker with which to interact",
    type: "string",
    default: process.env.BROKER_ID || "filecoin-bridge-edge.testnet",
  })
  .option("brokerAddr", {
    desc: "The address of the broker with which to interact",
    type: "string",
    default: process.env.BROKER_ADDR || "https://broker.edge.textile.dev",
  })
  .option("contractId", {
    desc: "The smart contract with which to interact",
    type: "string",
    default: process.env.CONTRACT_ID || "filecoin-bridge-edge.testnet",
  })
  .middleware(createKeyStore)
  .command(add)
  .command(release)
  .command(list)
  .command(has)
  .command(get)
  .command(status)
  .command(store)
  .showHelpOnFail(true)
  .recommendCommands()
  .demandCommand(
    1,
    chalk`Pass {bold --help} to see all available commands and options.`
  )
  .usage(chalk`Usage: {bold $0 <command> [options]}`)
  .epilogue(EPILOGUE)
  .wrap(null).argv;
