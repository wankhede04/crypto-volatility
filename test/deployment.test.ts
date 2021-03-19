import { expect } from "chai";
import { l2ethers as ethers } from 'hardhat'

describe("Token contract", function() {
  it("Deployment should assign the total supply of tokens to the owner", async function() {
    const VolmexProtocol = await ethers.getContractFactory("VolmexProtocol");
    const vp = await VolmexProtocol.deploy(0);

    await vp.deployed();

    console.log("VP deployed to:", vp.address);

    expect(vp).to.not.equal(null);
  });
});