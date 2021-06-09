import { ethers, upgrades } from "hardhat";

const upgrade = async () => {
  const proxyAddress = `${process.env.PROXY_ADDRESS}`;

  const VolmexProtocolV2Factory = await ethers.getContractFactory(
    "VolmexProtocolUpgradeMock"
  );

  await upgrades.upgradeProxy(proxyAddress, VolmexProtocolV2Factory);

  console.log("Volmex Protocol implementation upgraded");
}

upgrade()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log("Error: ", error);
    process.exit(1);
  });
