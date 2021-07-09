import { ethers, upgrades } from "hardhat";

const deployPolygon = async () => {
  const VolmexProtocolFactory = await ethers.getContractFactory(
    `${process.env.VOLMEX_PROTOCOL_CONTRACT}`
  );

  const VolatilityTokenFactory = await ethers.getContractFactory(
    "VolatilityTokenPolygon"
  );

  const VOLMEX_PROTOCOL_ROLE =
    "0x33ba6006595f7ad5c59211bde33456cab351f47602fc04f644c8690bc73c4e16";

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

  console.log("Granting VOLMEX_PROTOCOL_ROLE of volatility tokens to VolmexProtocol contract");

  const volatilityProtocolRole = await volatilityToken.grantRole(
    VOLMEX_PROTOCOL_ROLE,
    `${volmexProtocolInstance.address}`
  );

  await volatilityProtocolRole.wait();

  console.log("Role of volatility token granted");

  const inverseVolatilityProtocolRole = await inverseVolatilityToken.grantRole(
    VOLMEX_PROTOCOL_ROLE,
    `${volmexProtocolInstance.address}`
  );

  await volatilityProtocolRole.wait();

  console.log("Role of inverse volatility token granted");

  console.log("\n Transaction successful");
};

deployPolygon()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
