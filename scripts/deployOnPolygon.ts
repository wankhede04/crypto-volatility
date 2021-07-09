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
};

deployPolygon()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
