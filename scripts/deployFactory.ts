import { Contract, ContractReceipt, Event } from 'ethers';
import { ethers } from "hardhat";
import { Result } from '@ethersproject/abi';

export const decodeEvents = <T extends Contract>(token: T, events: Array<Event>): Array<Result> => {
  const decodedEvents = []
  for (const event of events) {
    const getEventInterface = token.interface.getEvent(event.event || '')
    decodedEvents.push(token.interface.decodeEventLog(getEventInterface, event.data, event.topics));
  }
  return decodedEvents;
}

export const filterEvents = (blockEvents: ContractReceipt, name: String): Array<Event> => {
  return blockEvents.events?.filter(event => event.event === name) || [];
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CollateralTokenFactory = await ethers.getContractFactory(
    "TestCollateralToken"
  );
  let CollateralToken = await CollateralTokenFactory.deploy();
  await CollateralToken.deployed();

  const VolmexIndexFactory = await ethers.getContractFactory("VolmexIndexFactory");
  const factory = await VolmexIndexFactory.deploy().then((f) => f.deployed());
  const deployedIndex = await factory.createIndex(
    CollateralToken.address,
    "20000000000000000000",
    "200",
    "Ethereum Volatility Index Token",
    "ETHV"
  );

  const transaction = await deployedIndex.wait();

  const indexCreatedEvent = decodeEvents(factory, filterEvents(transaction, 'IndexCreated'));
  const positionTokenCreated = decodeEvents(factory, filterEvents(transaction, 'PositionTokenCreated'));

  console.log("TestCollateralToken deployed to:", CollateralToken.address);
  console.log("Ethereum Volatility Index Token deployed to:", positionTokenCreated[0].volatilityToken);
  console.log(
    "Inverse Ethereum Volatility Index Token deployed to:",
    positionTokenCreated[0].inverseVolatilityToken
  );
  console.log(
    "Volmex Protocol deployed to:",
    indexCreatedEvent[0].index
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
