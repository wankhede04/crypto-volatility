import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployResult } from "hardhat-deploy/types";

const factory: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployFactory: DeployResult = await deploy("VolmexIndexFactory", {
    from: deployer,
    log: true,
  });

  console.log("Index Factory deployed on: ", deployFactory.address);
}

export default factory;
factory.tags = ["VolmexIndexFactory"];