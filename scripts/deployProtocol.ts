import { ethers } from "hardhat";
import { decodeEvents, filterEvents } from "./helper/events";

async function main() {
  let CollateralTokenAddress: string = `${process.env.COLLATERAL_TOKEN_ADDRESS}`;

  if (!process.env.COLLATERAL_TOKEN_ADDRESS) {
    const CollateralTokenFactory = await ethers.getContractFactory(
      "TestCollateralToken"
    );

    CollateralTokenAddress = (await CollateralTokenFactory.deploy()).address;
  }

  const VolmexIndexFactory = await ethers.getContractFactory(
    "VolmexIndexFactory"
  );
  const factory = await VolmexIndexFactory.deploy().then((f) => f.deployed());
  const deployedIndex = await factory.createIndex(
    CollateralTokenAddress,
    "20000000000000000000",
    "200",
    "Ethereum Volatility Index Token",
    "ETHV"
  );

  const transaction = await deployedIndex.wait();

  const indexCreatedEvent = decodeEvents(
    factory,
    filterEvents(transaction, "IndexCreated")
  );
  const positionTokenCreated = decodeEvents(
    factory,
    filterEvents(transaction, "PositionTokenCreated")
  );

  console.log("Volmex Protocol deployed to:", indexCreatedEvent[0].index);
  console.log("TestCollateralToken deployed to:", CollateralTokenAddress);
  console.log(
    "Ethereum Volatility Index Token deployed to:",
    positionTokenCreated[0].volatilityToken
  );
  console.log(
    "Inverse Ethereum Volatility Index Token deployed to:",
    positionTokenCreated[0].inverseVolatilityToken
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
