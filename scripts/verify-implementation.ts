import { run } from "hardhat";

const verify = async () => {
  const implementation = `${process.env.IMPLEMENTATION_ADDRESS}`;

  console.log("Verifying ", process.env.IMPLEMENTATION_ADDRESS);

  await run("verify:verify", {
    address: implementation,
  });
};

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log("Error: ", error);
    process.exit(1);
  });
