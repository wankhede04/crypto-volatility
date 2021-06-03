import { ethers, upgrades, run } from "hardhat";

const registerProtocol = async () => {
  const VolmexIndexFactory = await ethers.getContractFactory(
    "VolmexIndexFactory"
  );

  const VolmexProtocolFactory = await ethers.getContractFactory(
    "VolmexProtocol"
  );

  const proxyAdmin = await upgrades.admin.getInstance();

  const volmexIndexFactoryInstance = VolmexIndexFactory.attach(`${process.env.FACTORY_ADDRESS}`);

  const volmexProtocolInstance = await upgrades.deployProxy(
    VolmexProtocolFactory,
    [
      `${process.env.COLLATERAL_TOKEN_ADDRESS}`,
      `${process.env.VOLATILITY_TOKEN_ADDRESS}`,
      `${process.env.INVERSE_VOLATILITY_TOKEN_ADDRESS}`,
      `${process.env.MINIMUM_COLLATERAL_QTY}`,
      `${process.env.VOLATILITY_CAP_RATIO}`
    ]
  );
  await volmexProtocolInstance.deployed();

  console.log("Volmex Protocol Proxy deployed to: ", volmexProtocolInstance.address);

  const registerVolmexProtocol = await volmexIndexFactoryInstance.registerIndex(
    volmexProtocolInstance.address,
    `${process.env.COLLATERAL_TOKEN_SYMBOL}`
  );

  await registerVolmexProtocol.wait();

  const protocolImplementation = await proxyAdmin.getProxyImplementation(volmexProtocolInstance.address);

  await run("verify:verify", {
    address: protocolImplementation
  });
}

registerProtocol()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
