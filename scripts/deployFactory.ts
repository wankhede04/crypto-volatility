import { ethers } from "hardhat";

async function main() {
  const VolmexIndexFactory = await ethers.getContractFactory(
    "VolmexIndexFactory"
  );

  const factory = await VolmexIndexFactory.deploy().then((f) => f.deployed());

  console.log("Volmex Index Factory deployed to: ", factory.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
