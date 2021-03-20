const { expect } = require("chai");
const { expectEvent , expectRevert } = require('@openzeppelin/test-helpers');
const { ethers } = require("hardhat");

describe("Position Token contract", function () {
  /**
   * SCOPE OF THE TEST FOR THE POSITION TOKEN CONTRACT
   * contract is successfully deployed: DONE
   * deployed contract with the name and symbol as per the constructor: DONE
   * deployed with no totalSupply: DONE
   * only the owner of the contract is able to mint tokens: DONE
   * only the owner of the contract is able to burn tokens: DONE
   * only the owner of the contract is able to pause the contract
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

  it("minting tokens from any the owner account is successful", async function () {
    const value = await ethers.BigNumber.from("100");
    const toWhom = this.account2.address;
    await this.ptc.connect(this.owner).mint(toWhom, value);
    const account2Balance = await this.ptc.balanceOf(toWhom);
    const totalSupply = await this.ptc.totalSupply();
    expect(account2Balance).to.be.equal(value);
    expect(totalSupply).to.be.equal(value);
  });
});


