import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const factory: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const DeployedVolmexVolatilityToken = await deployments.get('VolmexPositionToken');

  const deployFactory = await deploy("VolmexIndexFactory", {
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [DeployedVolmexVolatilityToken.address],
    log: true,
    deterministicDeployment: true
  });

  //@ts-ignore
  const factoryImplementation = deployFactory.args[0];

  await hre.run("verify:verify", {
    address: factoryImplementation  
  });

  //@ts-ignore
  console.log("Proxy Admin deployed to: ", deployFactory.args[1])
  console.log("Index Factory Proxy deployed on: ", deployFactory.address);
  console.log("Index Factory Implementation deployed to: ", factoryImplementation);
}

export default factory;
factory.tags = ["Factory"];