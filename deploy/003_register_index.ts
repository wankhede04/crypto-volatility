import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { VolmexIndexFactory } from "../types";

const registerIndex: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployProtocol = await deploy("VolmexProtocol", {
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: "initialize",
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    args: [
      `${process.env.COLLATERAL_TOKEN_ADDRESS}`,
      `${process.env.VOLATILITY_TOKEN_ADDRESS}`,
      `${process.env.INVERSE_VOLATILITY_TOKEN_ADDRESS}`,
      `${process.env.MINIMUM_COLLATERAL_QTY}`,
      `${process.env.VOLATILITY_CAP_RATIO}`,
    ],
    log: true
  });

  const deployFactory = await deployments.get("VolmexIndexFactory");

  const factory = (await hre.ethers.getContractAt(
    deployFactory.abi,
    deployFactory.address
  )) as VolmexIndexFactory;

  await factory.registerIndex(
    deployProtocol.address,
    `${process.env.COLLATERAL_TOKEN_SYMBOL}`
  );

  // @ts-ignore
  const protocolImplementation = deployProtocol.args[0];

  //@ts-ignore
  console.log("Proxy Admin deployed to: ", deployProtocol.args[1])
  console.log("Volmex Protocol Proxy deployed to: ", deployProtocol.address);
  console.log("Volmex Protocol Implementation deployed to: ", protocolImplementation);

  await hre.run("verify:verify", {
    address: protocolImplementation,
  });
}

export default registerIndex;
registerIndex.tags = ["RegisterProtocol"];
