require("@nomiclabs/hardhat-waffle");
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import 'hardhat-contract-sizer';
import "hardhat-typechain";
import 'hardhat-deploy';
import * as dotenv from "dotenv";
import "@nomiclabs/hardhat-etherscan";
import '@eth-optimism/plugins/hardhat/compiler'

dotenv.config({ path: '.' + '/.env' });

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

export default {
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  optimizer: {
    enabled: true,
    runs: 200,
  },
  // defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      loggingEnabled: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545", // same address and port for both Buidler and Ganache node
      gas: 8000000,
      gasLimit: 8000000,
      gasPrice: 1,
    },
    kovan: {
      url: "https://kovan.infura.io/v3/e2a0f0db1ef34ac69c77250c55f0b6fd", // same address and port for both Buidler and Ganache node
      gas: 'auto',
      gasPrice: 'auto'
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  }
};