// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // We get the contract to deploy
  const VolmexProtocolFactory = await hre.ethers.getContractFactory(
    "VolmexProtocol"
  );
  const VolmexPositionTokenFactory = await hre.ethers.getContractFactory(
    "VolmexPositionToken"
  );
  const TestCollateralFactory = await hre.ethers.getContractFactory("TestCollateralToken");

  // deploying the testCollateral
  const testCollateralInstance = await TestCollateralFactory.deploy();
  await testCollateralInstance.deployed();

  // deploying the PositionTokenContracts
  const ethvLongToken = await VolmexPositionTokenFactory.deploy(
    "Ethereum Volatility Index Token",
    "ETHV"
  );
  await ethvLongToken.deployed();
  const ethvShortToken = await VolmexPositionTokenFactory.deploy(
    "Inverse Ethereum Volatility Index Token",
    "iETHV"
  );
  await ethvShortToken.deployed();

  const VolmexProtocolFactoryUpgradesInstance = await hre.upgrades.deployProxy(
    VolmexProtocolFactory,
    [
      testCollateralInstance.address,
      ethvLongToken.address,
      ethvShortToken.address,
      "20000000000000000000",
      "200"
    ]
  );

  await VolmexProtocolFactoryUpgradesInstance.deployed();

  // logging the addresses of the contracts
  console.log("TestCollateralToken deployed to:", testCollateralInstance.address);
  console.log("Ethereum Volatility Index Token deployed to:", ethvLongToken.address);
  console.log(
    "Inverse Ethereum Volatility Index Token deployed to:",
    ethvShortToken.address
  );
  console.log(
    "Volmex Protocol deployed to:",
    VolmexProtocolFactoryUpgradesInstance.address
  );

  // granting VOLMEX_PROTOCOL_ROLE to the protocol contract
  // We need to manually grant the role until we switch to hardhat-deploy.
  // await ethvLongToken.grantRole(
  //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VOLMEX_PROTOCOL_ROLE")),
  //   VolmexProtocolFactoryUpgradesInstance.address
  // );
  // await ethvShortToken.grantRole(
  //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VOLMEX_PROTOCOL_ROLE")),
  //   VolmexProtocolFactoryUpgradesInstance.address
  // );

  // verifying the contracts only if deployed to etherscan compatible network
  if (
    ["kovan", "rinkeby", "ropsten", "mainnet"].includes(
      ethers.provider.network.name
    )
  ) {
    // verifying the dummryERC20 contract
    await hre.run("verify:verify", {
      address: testCollateralInstance.address,
      constructorArguments: [],
    });

    // verifying the protocol contract
    await hre.run("verify:verify", {
      address: VolmexProtocolFactoryUpgradesInstance.address,
      constructorArguments: [
        testCollateralInstance.address,
        ethvLongToken.address,
        ethvShortToken.address,
        "20000000000000000000",
      ],
    });
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
