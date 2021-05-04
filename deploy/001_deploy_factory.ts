import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const factory: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const DeployedVolmexPositionToken = await deployments.get('VolmexPositionToken');

  const deployFactory = await deploy("VolmexIndexFactory", {
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [DeployedVolmexPositionToken.address],
    log: true,
  });

  //@ts-ignore
  const factoryImplementation = deployFactory.args[0];

  await hre.run("verify:verify", {
    address: factoryImplementation  
  });

  console.log("Index Factory deployed on: ", deployFactory.address);
}

export default factory;
factory.tags = ["Factory"];