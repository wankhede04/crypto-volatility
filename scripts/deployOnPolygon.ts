import { ethers, upgrades } from "hardhat";

const deployPolygon = async () => {
  const VolmexProtocolFactory = await ethers.getContractFactory(
    `${process.env.VOLMEX_PROTOCOL_CONTRACT}`
  );

  const VolatilityTokenFactory = await ethers.getContractFactory(
    "VolatilityTokenPolygon"
  );

  const IndexFactory = await ethers.getContractFactory(
    "IndexFactoryPolygon"
  );

  const DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  const CollateralTokenAddress: string = `${process.env.COLLATERAL_TOKEN_ADDRESS}`;

  console.log(`Deploying ${process.env.VOLATILITY_TOKEN_NAME} token`);

  const volatilityToken = await VolatilityTokenFactory.deploy(
    `${process.env.VOLATILITY_TOKEN_NAME}`,
    `${process.env.VOLATILITY_TOKEN_SYMBOL}`,
    `${process.env.CHILD_CHAIN_MANAGER}`
  );

  await volatilityToken.deployed();

  console.log(
    `Deployed ${process.env.VOLATILITY_TOKEN_NAME} token at: `,
    volatilityToken.address
  );

  console.log(`Deploying inverse ${process.env.VOLATILITY_TOKEN_NAME} token`);

  const inverseVolatilityToken = await VolatilityTokenFactory.deploy(
    `Inverse ${process.env.VOLATILITY_TOKEN_NAME}`,
    `i${process.env.VOLATILITY_TOKEN_SYMBOL}`,
    `${process.env.CHILD_CHAIN_MANAGER}`
  );

  await inverseVolatilityToken.deployed();

  console.log(
    `Deployed Inverse ${process.env.VOLATILITY_TOKEN_NAME} token at: `,
    inverseVolatilityToken.address
  );

  let volmexIndexFactoryInstance;
  if (process.env.FACTORY_ADDRESS) {
    volmexIndexFactoryInstance = IndexFactory.attach(
      `${process.env.FACTORY_ADDRESS}`
    );
  } else {
    console.log("Deploying IndexFactoryPolygon...");

    volmexIndexFactoryInstance = await upgrades.deployProxy(
      IndexFactory
    );
    await volmexIndexFactoryInstance.deployed();

    console.log(
      "Index Factory proxy deployed at: ",
      volmexIndexFactoryInstance.address
    );
  }

  console.log("Granting DEFAULT_ADMIN_ROLE of volatility tokens to IndexFactory contract");

  const volatilityProtocolRole = await volatilityToken.grantRole(
    DEFAULT_ADMIN_ROLE,
    `${volmexIndexFactoryInstance.address}`
  );

  await volatilityProtocolRole.wait();

  console.log("Role of volatility token granted");

  const inverseVolatilityProtocolRole = await inverseVolatilityToken.grantRole(
    DEFAULT_ADMIN_ROLE,
    `${volmexIndexFactoryInstance.address}`
  );

  await inverseVolatilityProtocolRole.wait();

  console.log("Role of inverse volatility token granted");

  console.log("Deploying Volmex Protocol...");

  const volmexProtocolInstance = await upgrades.deployProxy(
    VolmexProtocolFactory,
    [
      `${CollateralTokenAddress}`,
      `${volatilityToken.address}`,
      `${inverseVolatilityToken.address}`,
      `${process.env.MINIMUM_COLLATERAL_QTY}`,
      `${process.env.VOLATILITY_CAP_RATIO}`,
    ]
  );

  await volmexProtocolInstance.deployed();

  console.log(
    "Volmex Protocol Proxy deployed at: ",
    volmexProtocolInstance.address
  );

  console.log("Updating fees...");

  const feesReceipt = await volmexProtocolInstance.updateFees(
    `${process.env.ISSUE_FEES}`,
    `${process.env.REDEEM_FEES}`
  );

  await feesReceipt.wait();

  console.log("Protocol fees updated!");

  console.log("Registering VolmexProtocol...");

  const registerVolmexProtocol = await volmexIndexFactoryInstance.registerIndex(
    volmexProtocolInstance.address,
    `${process.env.COLLATERAL_TOKEN_SYMBOL}`
  );

  await registerVolmexProtocol.wait();

  console.log("Registered VolmexProtocol!");

  console.log("\n Transaction successful");
};

deployPolygon()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
