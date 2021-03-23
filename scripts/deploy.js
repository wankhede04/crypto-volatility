// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );
  
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // We get the contract to deploy
  const VolmexProtocolFactory = await hre.ethers.getContractFactory("VolmexProtocol");
  const VolmexPositionTokenFactory = await hre.ethers.getContractFactory("VolmexPositionToken");
  const DummyERC20Factory = await hre.ethers.getContractFactory("DummyERC20");

  // deploying the dummyERC20
  const dummyERC20Instance = await DummyERC20Factory.deploy();
  await dummyERC20Instance.deployed();

  // deploying the PositionTokenContracts
  const ethvLongToken  = await VolmexPositionTokenFactory.deploy("ETHVLong", "ETHVL");
  await ethvLongToken.deployed();
  const ethvShortToken  = await VolmexPositionTokenFactory.deploy("ETHVShort", "ETHVS");
  await ethvShortToken.deployed();

  const VolmexProtocolFactoryInstance = await VolmexProtocolFactory.deploy(
    dummyERC20Instance.address,
    ethvLongToken.address,
    ethvShortToken.address,
    "25000000000000000000"
  );

  await VolmexProtocolFactoryInstance.deployed();

  console.log("DummyERC20 deployed to:", dummyERC20Instance.address);
  console.log("ethvLongToken deployed to:", ethvLongToken.address);
  console.log("ethvShortToken deployed to:", ethvShortToken.address);
  console.log("VP deployed to:", VolmexProtocolFactoryInstance.address);

  await hre.run("verify:verify", {
    address: dummyERC20Instance.address,
    constructorArguments: []
  })

  await hre.run("verify:verify", {
    address: VolmexProtocolFactoryInstance.address,
    constructorArguments: [
      dummyERC20Instance.address,
      ethvLongToken.address,
      ethvShortToken.address,
      "25000000000000000000"
    ]
  })

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
