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

const deploy = async () => {
  const VolmexPositionTokenFactory = await ethers.getContractFactory(
    "VolmexPositionToken"
  );

  const VolmexProtocolFactory = await ethers.getContractFactory(
    `${process.env.VOLMEX_PROTOCOL_CONTRACT}`
  );
  const VolmexIndexFactory = await ethers.getContractFactory(
    "VolmexIndexFactory"
  );

  let CollateralTokenAddress: string = `${process.env.COLLATERAL_TOKEN_ADDRESS}`;

  if (!process.env.COLLATERAL_TOKEN_ADDRESS) {
    const TestCollateralFactory = await ethers.getContractFactory(
      "TestCollateralToken"
    );
    const TestCollateralFactoryInstance = await TestCollateralFactory.deploy();
    CollateralTokenAddress = (await TestCollateralFactoryInstance.deployed())
      .address;

    console.log("Test Collateral Token deployed to: ", CollateralTokenAddress);

    await run("verify:verify", {
      address: CollateralTokenAddress,
    });
  }

  let volmexIndexFactoryInstance, proxyAdmin;
  if (process.env.FACTORY_ADDRESS) {
    volmexIndexFactoryInstance = VolmexIndexFactory.attach(
      `${process.env.FACTORY_ADDRESS}`
    );
  } else {
    console.log("Deploying VolmexPositionToken implementation...");

    const volmexPositionTokenFactoryInstance =
      await VolmexPositionTokenFactory.deploy();
    await volmexPositionTokenFactoryInstance.deployed();

    await run("verify:verify", {
      address: volmexPositionTokenFactoryInstance.address,
    });

    console.log("Deploying VolmexIndexFactory...");

    volmexIndexFactoryInstance = await upgrades.deployProxy(
      VolmexIndexFactory,
      [volmexPositionTokenFactoryInstance.address]
    );
    await volmexIndexFactoryInstance.deployed();

    console.log(
      "Index Factory proxy deployed to: ",
      volmexIndexFactoryInstance.address
    );

    proxyAdmin = await upgrades.admin.getInstance();
    console.log("Proxy Admin deployed to:", proxyAdmin.address);

    const factoryImplementation = await proxyAdmin.getProxyImplementation(
      volmexIndexFactoryInstance.address
    );

    console.log("Verifying VolmexIndexFactory on etherscan...");

    await run("verify:verify", {
      address: factoryImplementation,
    });
  }

  const volatilityToken =
    await volmexIndexFactoryInstance.createVolatilityTokens(
      `${process.env.VOLATILITY_TOKEN_NAME}`,
      `${process.env.VOLATILITY_TOKEN_SYMBOL}`
    );

  const receipt = await volatilityToken.wait();

  const positionTokenCreatedEvent = decodeEvents(
    volmexIndexFactoryInstance,
    filterEvents(receipt, "VolatilityTokenCreated")
  );

  console.log(
    "Volatility Index Token deployed to: ",
    positionTokenCreatedEvent[0].volatilityToken
  );
  console.log(
    "Inverse Volatility Index Token deployed to: ",
    positionTokenCreatedEvent[0].inverseVolatilityToken
  );

  console.log("Deploying VolmexProtocol...");

  let protocolInitializeArgs = [
    CollateralTokenAddress,
    positionTokenCreatedEvent[0].volatilityToken,
    positionTokenCreatedEvent[0].inverseVolatilityToken,
    `${process.env.MINIMUM_COLLATERAL_QTY}`,
    `${process.env.VOLATILITY_CAP_RATIO}`,
  ];

  if (process.env.PRECISION_RATIO) {
    protocolInitializeArgs.push(`${process.env.PRECISION_RATIO}`);
  }

  const volmexProtocolInstance = await upgrades.deployProxy(
    VolmexProtocolFactory,
    protocolInitializeArgs,
    {
      initializer: process.env.PRECISION_RATIO ? "initializePrecision" : "initialize",
    }
  );
  await volmexProtocolInstance.deployed();

  console.log(
    "Volmex Protocol Proxy deployed to: ",
    volmexProtocolInstance.address
  );

  console.log("Updating Issueance and Redeem fees...");

  const feeReceipt = await volmexProtocolInstance.updateFees(
    process.env.ISSUE_FEES || 10,
    process.env.REDEEM_FEES || 30
  );
  await feeReceipt.wait();

  console.log("Updated Issueance and Redeem fees");

  if ((await volmexIndexFactoryInstance.indexCount()) === 0) {
    // @ts-ignore
    const protocolImplementation = await proxyAdmin.getProxyImplementation(
      volmexProtocolInstance.address
    );

    console.log("Verifying VolmexProtocol...");

    await run("verify:verify", {
      address: protocolImplementation,
    });
  }

  console.log("Registering VolmexProtocol...");

  const registerVolmexProtocol = await volmexIndexFactoryInstance.registerIndex(
    volmexProtocolInstance.address,
    `${process.env.COLLATERAL_TOKEN_SYMBOL}`
  );

  await registerVolmexProtocol.wait();

  console.log("Registered VolmexProtocol!");
};

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
