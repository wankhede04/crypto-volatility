import { ethers, upgrades, run } from "hardhat";
import { Contract, ContractReceipt, Event } from "ethers";
import { Result } from "@ethersproject/abi";

const filterEvents = (
  blockEvents: ContractReceipt,
  name: String
): Array<Event> => {
  return blockEvents.events?.filter((event) => event.event === name) || [];
};

export const decodeEvents = <T extends Contract>(
  token: T,
  events: Array<Event>
): Array<Result> => {
  const decodedEvents = [];
  for (const event of events) {
    const getEventInterface = token.interface.getEvent(event.event || "");
    decodedEvents.push(
      token.interface.decodeEventLog(
        getEventInterface,
        event.data,
        event.topics
      )
    );
  }
  return decodedEvents;
};

const main = async () => {
  const VolmexProtocolFactory = await ethers.getContractFactory(
    "VolmexProtocol"
  );
  const VolmexIndexFactory = await ethers.getContractFactory(
    "VolmexIndexFactory"
  );

  let CollateralTokenAddress: string = `${process.env.COLLATERAL_TOKEN_ADDRESS}`;

  if (!process.env.COLLATERAL_TOKEN_ADDRESS) {
    const TestCollateralFactory = await ethers.getContractFactory("TestCollateralToken");
    const TestCollateralFactoryInstance = await TestCollateralFactory.deploy();
    CollateralTokenAddress = (await TestCollateralFactoryInstance.deployed()).address;

    console.log("Test Collateral Token deployed to: ", CollateralTokenAddress);
  }

  const volmexIndexFactoryInstance = await upgrades.deployProxy(
    VolmexIndexFactory
  );
  await volmexIndexFactoryInstance.deployed();

  console.log("Index Factory proxy deployed to: ", volmexIndexFactoryInstance.address);

  const proxyAdmin = await upgrades.admin.getInstance();
  console.log('Proxy Admin deployed to:', proxyAdmin.address);

  const factoryImplementation = await proxyAdmin.getProxyImplementation(volmexIndexFactoryInstance.address);

  await run("verify:verify", {
    address: factoryImplementation
  });

  const volatilityToken = await volmexIndexFactoryInstance.createVolatilityTokens(
    "Ethereum Volatility Index Token",
    "ETHV"
  );

  const positionTokenCreatedEvent = decodeEvents(
    volmexIndexFactoryInstance,
    filterEvents(await volatilityToken.wait(), "VolatilityTokenCreated")
  );

  console.log("Volatility Index Token deployed to: ", positionTokenCreatedEvent[0].volatilityToken);
  console.log("Inverse Volatility Index Token deployed to: ", positionTokenCreatedEvent[0].inverseVolatilityToken);

  const volatilityImplementation = await proxyAdmin.getProxyImplementation(positionTokenCreatedEvent[0].volatilityToken.address);
  const inverseVolatilityImplementation = await proxyAdmin.getProxyImplementation(positionTokenCreatedEvent[0].inverseVolatilityToken.address);

  await run("verify:verify", {
    address: volatilityImplementation
  });

  await run("verify:verify", {
    address: inverseVolatilityImplementation
  });

  const volmexProtocolInstance = await upgrades.deployProxy(
    VolmexProtocolFactory,
    [
      CollateralTokenAddress,
      positionTokenCreatedEvent[0].volatilityToken,
      positionTokenCreatedEvent[0].inverseVolatilityToken,
      "200000000000000000000",
      "200"
    ]
  );
  await volmexProtocolInstance.deployed();

  const protocolImplementation = await proxyAdmin.getProxyImplementation(volmexProtocolInstance.address);

  await run("verify:verify", {
    address: protocolImplementation
  });

  await volmexIndexFactoryInstance.registerIndex(
    positionTokenCreatedEvent[0].indexCount,
    volmexProtocolInstance.address
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
