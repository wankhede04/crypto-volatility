import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployResult } from "hardhat-deploy/types";
import { decodeEvents, filterEvents } from "../helper/decodeEvents";

const protocol: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployFactory: DeployResult = await deploy("VolmexIndexFactory", {
    from: deployer,
    log: true,
  });

  let CollateralTokenAddress: string = `${process.env.COLLATERAL_TOKEN_ADDRESS}`;

  if (!process.env.COLLATERAL_TOKEN_ADDRESS) {
    const testCollateralToken: DeployResult = await deploy("TestCollateralToken", {
      from: deployer,
      log: true
    });

    CollateralTokenAddress = testCollateralToken.address;
  }

  const createIndex = await execute(
    "VolmexIndexFactory",
    { from: deployer },
    "createIndex",
    CollateralTokenAddress,
    "20000000000000000000",
    "200",
    "Ethereum Volatility Index Token",
    "ETHV"
  );

  const indexCreatedEvent = decodeEvents(
    deployFactory,
    filterEvents(createIndex, "IndexCreated"),
    "IndexCreated"
  );
  const positionTokenCreatedEvent = decodeEvents(
    deployFactory,
    filterEvents(createIndex, "PositionTokenCreated"),
    "PositionTokenCreated"
  );

  console.log("Index Factory deployed on: ", deployFactory.address);
  console.log("Volmex Protocol deployed on: ", indexCreatedEvent[0].index);
  console.log(
    "Ethereum Volatility Index Token deployed to:",
    positionTokenCreatedEvent[0].volatilityToken
  );
  console.log(
    "Inverse Ethereum Volatility Index Token deployed to:",
    positionTokenCreatedEvent[0].inverseVolatilityToken
  );
};

export default protocol;
protocol.tags = ["Protocol"];
