# @textile/near-storage-cli

[![GitHub package.json version](https://img.shields.io/github/package-json/v/textileio/near-storage-cli.svg)](./package.json)
[![npm (scoped)](https://img.shields.io/npm/v/@textile/near-storage-cli.svg)](https://www.npmjs.com/package/@textile/near-storage-cli)
[![Release](https://img.shields.io/github/release/textileio/near-storage-cli.svg)](https://github.com/textileio/near-storage-cli/releases/latest)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg)](https://github.com/RichardLitt/standard-readme)

<!-- [![Docs](https://github.com/textileio/near-storage-cli/workflows/Docs/badge.svg)](https://github.com/textileio/near-storage-cli/actions/workflows/docs.yml)
[![Tests](https://github.com/textileio/near-storage-cli/workflows/Test/badge.svg)](https://github.com/textileio/near-storage-cli/actions/workflows/test.yml) -->

> Command-line utilities for Textile's Broker-based data storage system on the Near blockchain.

# Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

# Background

**Warning: This is pre-release software!**

`@textile/near-storage-cli` provides a minimalist command-line utility for working with Textile's NEAR bridge provider ecosystem. The CLI utilities make it easy to store data on the Filecoin network using your NEAR credentials. `@textile/near-storage-cli` integrates with the existing `near-cli` tooling, to make it easy to integrate into your NEAR projects, and even make it part of your NEAR NFT development process. The CLI provides a small but powerful API surface that integrates nicely with existing NEAR development best practices. Simply login with NEAR, deposit some funds with the `@textile/near-storage` smart contract, and you are ready to start submitting data to be stored on the Filecoin network.

# Install

```bash
npm i -g @textile/near-storage-cli
```

## Usage

```bash
bridge --help
# Usage: bridge <command> [options]

# Commands:
#   bridge deposit [accountId]  add deposit for account
#   bridge release [accountId]  release deposits for all accounts
#   bridge list                 list available brokers
#   bridge has <accountId>      check if account has deposit
#   bridge get <brokerId>       get information about a given broker
#   bridge status <requestId>   get information about the status of a storage request
#   bridge store <filename>     push a file to a storage provider

# Options:
#   --help        Show help  [boolean]
#   --version     Show version number  [boolean]
#   --accountId   Unique identifier for the account  [string] [default: ""]
#   --networkId   NEAR network ID, allows using different keys based on network  [string] [default: "testnet"]
#   --brokerId    The broker with which to interact  [string] [default: "filecoin-bridge.testnet"]
#   --brokerAddr  The address of the broker with which to interact  [string] [default: "https://broker.staging.textile.dev"]
#   --contractId  The smart contract with which to interact  [string] [default: "filecoin-bridge.testnet"]

# This is a beta release of @textile/near-storage-cli. Do not store personal, encrypted, or illegal data.
# Data will not be available permanently on either Filecoin or IPFS.
# See the full terms of service (TOS) for details: https://near.storage/terms
```

# API

## Setup

Just use the normal NEAR CLI login process.

```bash
near login
# Follow prompts
```

Most commands require the `--accountId` flag to be set, so you can sign transactions on the NEAR network. However, you can make things a lot easier on yourself by creating a `.env` file that contains this (and other credentials). Any of the above top-level flags can be added to the `.env` file, such that `networkId` becomes `NETWORK_ID`, `accountId` becomes `ACCOUNT_ID`, and so on.

```bash
echo ACCOUNT_ID=account.testnet > .env
```

## Create session

The core storage API revolves around two key concepts: _deposits_ and _storage_. Leaving a deposit provides a degree of Sybil resistance, such that users looking to store data on Filecoin via the provider must first deposit funds proportional to the length of time they'd like to continue storing data (for testnet, the default timeout is ~10 minutes). To store data, a minimum (default) deposit must be left with a provider.

You can get a list of registered providers:

```bash
bridge list
# [
#   {
#     brokerId: 'filecoin-bridge.testnet',
#     addresses: [ 'https://broker.stating.textile.dev' ]
#   }
# ]
```

And if you know the NEAR account of the broker you are looking for, you can get it directly:

```bash
bridge get filecoin-bridge.testnet
# {
#   brokerId: 'filecoin-bridge.testnet',
#   addresses: [ 'https://broker.staging.textile.dev' ]
# }
```

Once you know which broker you want to deposit funds with (or if you don't know, one will be chosen for you automatically), you can deposit your funds. A deposit is generally valid for about 10 minutes (based on blocks). Adding further deposits extends your session, though all funds will be held until they expire, so use this feature sparingly. After funds expire, they can be released by the user or any other party interacting with the `@textile/near-storage` smart contract (such as the provider itself). This provides a means to release funds after a storage session has completed, without locking funds in the contract during the Filecoin proof process.

```bash
bridge deposit --brokerId filecoin-bridge.testnet --brokerAddr https://broker.staging.textile.dev
# {
#   accountId: 'account.testnet',
#   brokerId: 'filecoin-bridge.testnet',
#   deposit: {
#     sender: 'account.testnet',
#     expiration: 'XXXXXXXXX',
#     amount: '250000000000000000000000'
#   }
# }
```

You can always check to see if you (or any other account) has a valid session:

```bash
bridge has --accountId account.testnet
# true
```

## Store data

Once a valid deposit is available, the CLI can be used to push data to the provider using the `store` sub-command. This simply takes a file, and send the bytes to the provider for preparation and Filecoin storage.

```bash
bridge store ~/Downloads/textile-logo.gif
# {
#   id: 'ab425674-7d1a-43fa-ba05-190194cbe36b',
#   cid: {
#     '/': 'bafybeifam2sar752z22imrghxoej5gvnykn4ih4gknvtrhchry7u3e5fp4'
#   },
#   status_code: 1
# }
```

## Check status

The status of the file can be queried using its `id`. The storage process ranges from "batching" files together, to "preparing" the storage deal, to "auctioning" the set of storage deals, to the actual "deal making" and "success" of the final storage deal on Filecoin. Along the way, you can use the CLI to query its status.

```bash
bridge status ab425674-7d1a-43fa-ba05-190194cbe36b
# {
#   request: {
#     id: 'ab425674-7d1a-43fa-ba05-190194cbe36b',
#     cid: {
#       '/': 'bafybeifam2sar752z22imrghxoej5gvnykn4ih4gknvtrhchry7u3e5fp4'
#     },
#     status_code: 3 // Auctioning
#   },
#   deals: null
# }
```

It is now safe to release the deposit(s):

```bash
bridge release
# true
```

# Maintainers

[@carsonfarmer](https://github.com/carsonfarmer)

# Contributing

PRs accepted.

Small note: If editing the README, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

# License

Dual MIT and Apache © 2021 Textile.io
