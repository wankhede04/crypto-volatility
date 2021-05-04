import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const positionToken: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployPositionImplementation = await deploy("VolmexPositionToken", {
    from: deployer,
    log: true
  });

  await hre.run("verify:verify", {
    address: deployPositionImplementation.address
  });

  console.log(
    "Position Token Implementation deployed on: ",
    deployPositionImplementation.address
  );
};

export default positionToken;
positionToken.tags = ["PositionTokenImplementation"];
