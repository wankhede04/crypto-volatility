const { expect } = require("chai");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ethers } = require("hardhat");

// custom function to check event and its args
const checkEvent = async (r: any, ...args: string[]) => {
  // args[0] will be the name of the event
  // rest of the args will be the parameters of the event
  const [eventName, ...eventParameters] = args; 
  let eventNameCheck = true;
  let argsCheck = true;
  // check if the receipt has the event based on the eventName
  const event = (await r.wait()).events[0];
  const rEventName = event.event;
  if (eventName != rEventName) {
    eventNameCheck = false;
    return (false);
  } 
  // check if the event arguments contain the arguments provided for the test
  const rArgs = event.args;
  if (eventParameters.length != rArgs.length) {
    argsCheck = false;
    return false;
  }
  eventParameters.forEach(element => {
    if (rArgs[element] == null || undefined) {
      argsCheck = false;
      return false;
    };
  });
  return true;
}

describe("Position Token contract", function () {
  /**
   * SCOPE OF THE TEST FOR THE POSITION TOKEN CONTRACT
   * contract is successfully deployed: DONE
   * deployed contract with the name and symbol as per the constructor: DONE
   * deployed with no totalSupply: DONE
   * only the owner of the contract is able to mint tokens: DONE
   * only the owner of the contract is able to burn tokens: DONE
   * only the owner of the contract is able to pause the contract: DONE
   * once the contract is paused no token can be transferred
   * once the contract is paused no token can be minted
   * once the contract is paused no token can be burned
   */

  before(async function () {
    [this.owner, this.account2, this.account3] = await ethers.getSigners();
    this.PositionTokenContract = await ethers.getContractFactory("VolmexPositionToken");
    this.tokenName = "ETHVLong";
    this.tokenSymbol = "ETHVL"
  });

  // deploying a fresh PTContract before each test
  beforeEach(async function () {
    this.ptc = await this.PositionTokenContract.deploy(this.tokenName, this.tokenSymbol);
    await this.ptc.deployed();
  });

  it("contract is successfully deployed", async function () {
    const address = this.ptc.address;
    expect(address).to.not.equal(null);
  });

  it("name and symbol of the contract is as per the arguments", async function () {
    const ptTokenName = await this.ptc.name();
    expect(ptTokenName).to.be.equal(this.tokenName);
  });

  it("on deployment the totalSupply is zero", async function () {
    const ptTotalSupply = await this.ptc.totalSupply();
    expect(ptTotalSupply).to.be.equal(0);
  });

  it("minting tokens from any other account fails", async function () {
    const value = await ethers.BigNumber.from("42");
    const toWhom = this.account2.address;
    await expectRevert(
      this.ptc.connect(this.account2).mint(toWhom, value),
      'VolmexPositionToken: must have minter role to mint'
    );
  });

  it("minting tokens from the owner account is successful", async function () {
    const value = await ethers.BigNumber.from("100");
    const toWhom = this.account2.address;
    const receipt = await this.ptc.connect(this.owner).mint(toWhom, value);
    expect((await checkEvent(receipt, "Transfer", "from", "to", "value"))).to.be.true;
    const account2Balance = await this.ptc.balanceOf(toWhom);
    const totalSupply = await this.ptc.totalSupply();
    expect(account2Balance).to.be.equal(value);
    expect(totalSupply).to.be.equal(value);
  });

  it("pausing token only from the owner account is successful", async function () {
    await expectRevert(
      this.ptc.connect(this.account2).pause(),
      'VolmexPositionToken: must have pauser role to pause'
    );
    const receipt = await this.ptc.pause();
    expect((await checkEvent(receipt, "Paused", "account"))).to.be.true;
  });

});


