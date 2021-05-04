import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const positionToken: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployVolatilityImplementation = await deploy("VolmexPositionToken", {
    from: deployer,
    log: true
  });

  await hre.run("verify:verify", {
    address: deployVolatilityImplementation.address
  });

  console.log(
    "Volatility Token Implementation deployed on: ",
    deployVolatilityImplementation.address
  );
};

export default positionToken;
positionToken.tags = ["VolatilityTokenImplementation"];
