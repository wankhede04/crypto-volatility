const { defender } = require("hardhat");
import { ethers } from "hardhat";

const upgrade = async () => {
  const proxyAddress = `${process.env.PROXY_ADDRESS}`;

  const VolmexProtocolV2Factory = await ethers.getContractFactory(
    "VolmexProtocolV2"
  );

  const proposal = await defender.proposeUpgrade(
    proxyAddress,
    VolmexProtocolV2Factory
  );
  console.log("Upgrade proposal created at:", proposal.url);
};

upgrade()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
