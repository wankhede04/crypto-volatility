import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployResult } from "hardhat-deploy/types";
import { origFilterEvents } from "../helper/decodeEvents";
import { VolmexIndexFactory } from "../types";

const protocol: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployFactory = await deployments.get("VolmexIndexFactory");

  const factory = (await hre.ethers.getContractAt(
    deployFactory.abi,
    deployFactory.address
  )) as VolmexIndexFactory;

  const volatilityToken = await factory.createVolatilityTokens(
    "Ethereum Volatility Index Token",
    "ETHV"
  );

  const receipt = await volatilityToken.wait();

  const positionTokenCreatedEvent = origFilterEvents(
    receipt,
    "PositionTokenCreated"
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

  //@ts-ignore
  const indexCount = positionTokenCreatedEvent[0].args["indexCount"];

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
      "200000000000000000000",
      "200",
    ],
    log: true,
  });

  //@ts-ignore
  const protocolImplementation = deployProtocol.args[0];

  await hre.run("verify:verify", {
    address: protocolImplementation,
  });

  await factory.registerIndex(indexCount, deployProtocol.address);

  console.log("Volmex Protocol deployed to: ", deployProtocol.address);
};

export default protocol;
protocol.tags = ["Protocol"];
