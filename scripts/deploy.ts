import { ethers, upgrades } from "hardhat";
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
  }

  const volmexIndexFactoryInstance = await VolmexIndexFactory.deploy();
  await volmexIndexFactoryInstance.deployed();
  // TODO: add etherscan verification code of implementation

  const volatilityToken = await volmexIndexFactoryInstance.createVolatilityTokens(
    "Ethereum Volatility Index Token",
    "ETHV"
  );

  const positionTokenCreatedEvent = decodeEvents(
    volmexIndexFactoryInstance,
    filterEvents(await volatilityToken.wait(), "PositionTokenCreated")
  );

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

  const volmexProtocolRegister = await volmexIndexFactoryInstance.registerIndex(
    positionTokenCreatedEvent[0].indexCount,
    volmexProtocolInstance.address
  );

  const indexRegistered = decodeEvents(
    volmexIndexFactoryInstance,
    filterEvents(await volmexProtocolRegister.wait(), "IndexRegistered")
  );

  console.log("Index Factory deployed to: ", volmexIndexFactoryInstance.address);
  console.log("Volmex Protocol deployed to: ", indexRegistered[0].index);
  console.log("Volatility Index Token deployed to: ", positionTokenCreatedEvent[0].volatilityToken);
  console.log("Inverse Volatility Index Token deployed to: ", positionTokenCreatedEvent[0].inverseVolatilityToken);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
