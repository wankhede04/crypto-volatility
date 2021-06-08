import { upgrades } from "hardhat";

const transferOwnership = async () => {
  const gnosisSafe = `${process.env.GNOSIS_SAFE_ADDRESS}`;

  await upgrades.admin.transferProxyAdminOwnership(gnosisSafe);
  console.log("Transferred ownership of ProxyAdmin to: ", gnosisSafe);
};

transferOwnership()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
  });
