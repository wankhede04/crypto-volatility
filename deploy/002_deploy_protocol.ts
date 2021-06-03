import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployResult } from "hardhat-deploy/types";
import { origFilterEvents } from "../helper/decodeEvents";
import { VolmexIndexFactory } from "../types";

const protocol: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployFactory = await deployments.get("VolmexIndexFactory");

  const factory = (await hre.ethers.getContractAt(
    deployFactory.abi,
    deployFactory.address
  )) as VolmexIndexFactory;

  const volatilityToken = await factory.createVolatilityTokens(
    `${process.env.VOLATILITY_TOKEN_NAME}`,
    `${process.env.VOLATILITY_TOKEN_SYMBOL}`
  );

  const receipt = await volatilityToken.wait();

  const positionTokenCreatedEvent = origFilterEvents(
    receipt,
    "VolatilityTokenCreated"
  );

  //@ts-ignore
  const volatilityTokenAddress = positionTokenCreatedEvent[0].args["volatilityToken"];
  console.log("Volatility Index Token deployed to: ", volatilityTokenAddress);

  //@ts-ignore
  const inverseVolatilityTokenAddress = positionTokenCreatedEvent[0].args["inverseVolatilityToken"];
  console.log(
    "Inverse Volatility Index Token deployed to: ",
    inverseVolatilityTokenAddress
  );

  let CollateralTokenAddress: string = `${process.env.COLLATERAL_TOKEN_ADDRESS}`;

  if (!process.env.COLLATERAL_TOKEN_ADDRESS) {
    const testCollateralToken: DeployResult = await deploy(
      "TestCollateralToken",
      {
        from: deployer,
        log: true
      }
    );

    CollateralTokenAddress = testCollateralToken.address;
  }

  const deployProtocol = await deploy("VolmexProtocol", {
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: "initialize",
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    args: [
      CollateralTokenAddress,
      volatilityTokenAddress,
      inverseVolatilityTokenAddress,
      `${process.env.MINIMUM_COLLATERAL_QTY}`,
      `${process.env.VOLATILITY_CAP_RATIO}`,
    ],
    log: true
  });

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
};

export default protocol;
protocol.tags = ["Protocol"];
