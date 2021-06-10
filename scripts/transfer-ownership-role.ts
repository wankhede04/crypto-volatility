import { ethers } from "hardhat";

const transferRole = async () => {
  const [ owner ] = await ethers.getSigners();

  const gnosisSafe = `${process.env.GNOSIS_SAFE_ADDRESS}`;
  const DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  const VolmexProtocolFactory = await ethers.getContractFactory(
    "VolmexProtocol"
  );

  const VolmexPositionTokenFactory = await ethers.getContractFactory(
    "VolmexPositionToken"
  );

  const volmexProtocolInstance = VolmexProtocolFactory.attach(
    `${process.env.VOLMEX_PROTOCOL_ADDRESS}`
  );

  let receipt = await volmexProtocolInstance.transferOwnership(gnosisSafe);
  await receipt.wait();
  console.log("Volmex Protocol ownership transferred to: ", gnosisSafe);

  const volmexPositionTokenInstance = VolmexPositionTokenFactory.attach(
    `${process.env.VOLATILITY_TOKEN_ADDRESS}`
  );

  const inverseVolmexPositionTokenInstance = VolmexPositionTokenFactory.attach(
    `${process.env.INVERSE_VOLATILITY_TOKEN_ADDRESS}`
  );

  receipt = await volmexPositionTokenInstance.grantRole(
    DEFAULT_ADMIN_ROLE,
    gnosisSafe
  );
  await receipt.wait();

  receipt = await volmexPositionTokenInstance.renounceRole(
    DEFAULT_ADMIN_ROLE,
    owner.address
  );
  await receipt.wait();

  receipt = await inverseVolmexPositionTokenInstance.grantRole(
    DEFAULT_ADMIN_ROLE,
    gnosisSafe
  );
  await receipt.wait();

  receipt = await inverseVolmexPositionTokenInstance.renounceRole(
    DEFAULT_ADMIN_ROLE,
    owner.address
  );
  await receipt.wait();

  console.log("Granted DEFAULT_ADMIN_ROLE of volatility tokens to: ", gnosisSafe);
};

transferRole()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
