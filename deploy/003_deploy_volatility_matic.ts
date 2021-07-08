import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const positionToken: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployVolatilityImplementation = await deploy("MaticVolatilityToken", {
    from: deployer,
    log: true,
    args: [
      process.env.VOLATILITY_TOKEN_NAME,
      process.env.VOLATILITY_TOKEN_SYMBOL,
      process.env.CHAIN_MANAGER
    ]
  });

  // await hre.run("verify:verify", {
  //   address: deployVolatilityImplementation.address
  // });

  console.log(
    "Volatility Token Implementation deployed on: ",
    deployVolatilityImplementation.address
  );

  const deployInverseVolatilityImplementation = await deploy("MaticVolatilityToken", {
    from: deployer,
    log: true,
    args: [
      `Inverse ${process.env.VOLATILITY_TOKEN_NAME}`,
      `i${process.env.VOLATILITY_TOKEN_SYMBOL}`,
      process.env.CHAIN_MANAGER
    ]
  });

  // await hre.run("verify:verify", {
  //   address: deployInverseVolatilityImplementation.address
  // });

  console.log(
    "Volatility Token Implementation deployed on: ",
    deployInverseVolatilityImplementation.address
  );
};

export default positionToken;
positionToken.tags = ["VolatilityTokensMatic"];
