import { ethers, upgrades, run } from "hardhat";

const upgrade = async () => {
  const proxyAddress = `${process.env.PROXY_ADDRESS}`;

  const VolmexProtocolV2Factory = await ethers.getContractFactory("VolmexProtocolV2");

  const volmexProtocolInstance = await upgrades.upgradeProxy(proxyAddress, VolmexProtocolV2Factory);
  const proxyAdmin = await upgrades.admin.getInstance();

  // @ts-ignore
  const protocolImplementation = await proxyAdmin.getProxyImplementation(volmexProtocolInstance.address);

  await run("verify:verify", {
    address: protocolImplementation,
  });

  console.log("Volmex Protocol implementation upgraded");
};

upgrade()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log("Error: ", error);
    process.exit(1);
  });
