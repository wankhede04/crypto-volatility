import { MaticPOSClient } from "@maticnetwork/maticjs";
import { ethers } from "ethers";

const parentProvider = `https://eth-goerli.alchemyapi.io/v2/t3m7WXf8TmfndavyWqLQT2s64e4mq9jF`;
const maticProvider = `https://rpc-mumbai.maticvigil.com/v1/9ed5e5a2f3af92d8b26b0cd1ca2b1199a7dc11ea`;
const rootChainManager  = "0xBbD7cBFA79faee899Eaf900F13C9065bF03B1A74";
const userAddress = "0xeBac98733b0a25FcDd56Bd078FFCC2350B6ba403";
const transactionHash = "0x09e4288b1c5c0ce1123f809ec707571ae90754744ca095ce6a6335f85a8e88d2";
const mintableERC20PredicateProxy = "0x37c3bfC05d5ebF9EBb3FF80ce0bd0133Bf221BC8";

const maticPOSClient = new MaticPOSClient({
  network: "testnet",
  version: "mumbai",
  parentProvider: new ethers.providers.JsonRpcProvider(parentProvider),
  maticProvider: new ethers.providers.JsonRpcProvider(maticProvider),
  posRootChainManager: rootChainManager,
  posERC20Predicate: mintableERC20PredicateProxy
});

const main = async (): Promise<void> => {
  console.log("--------", parentProvider)
  try {
    const exitCalldata = await maticPOSClient.exitERC20(transactionHash);
  
    console.log(exitCalldata);
  } catch(e) {
    console.log("Error: ===========", e)
  }
  
};

main().then(res => {
  console.log(res);
  process.exit(0);
}).catch(e => {
  process.exit(1);
});
