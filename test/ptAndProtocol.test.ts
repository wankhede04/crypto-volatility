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
   * 1. contract is successfully deployed: DONE
   * 2. deployed contract with the name and symbol as per the constructor: DONE
   * 3. deployed with no totalSupply: DONE
   * 4. only the owner of the contract is able to mint tokens: DONE
   * 5. only the owner of the contract is able to burn tokens: DONE
   * 6. only the owner of the contract is able to pause the contract: DONE
   * 7. once the contract is paused no token can be transferred: DONE
   * 8. once the contract is paused no token can be minted: DONE
   * 9. once the contract is paused no token can be burned: DONE
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

  it("deployed contract with the name and symbol as per the constructor", async function () {
    const ptTokenName = await this.ptc.name();
    expect(ptTokenName).to.be.equal(this.tokenName);
  });

  it("deployed with no totalSupply", async function () {
    const ptTotalSupply = await this.ptc.totalSupply();
    expect(ptTotalSupply).to.be.equal(0);
  });

  it("only the owner of the contract is able to mint tokens", async function () {
    // minting tokens from non-owner account, expecting revert
    const value = await ethers.BigNumber.from("100");
    const toWhom = this.account2.address;
    await expectRevert(
      this.ptc.connect(this.account2).mint(toWhom, value),
      'VolmexPositionToken: must have minter role to mint'
    );
    // minting tokens from owner account, expecting success
    const receipt = await this.ptc.mint(toWhom, value);
    expect((await checkEvent(receipt, "Transfer", "from", "to", "value"))).to.be.true;
    /// double confirming on the basis of the balance
    const account2Balance = await this.ptc.balanceOf(toWhom);
    const totalSupply = await this.ptc.totalSupply();
    expect(account2Balance).to.be.equal(value);
    expect(totalSupply).to.be.equal(value);
  });

  it("only the owner of the contract is able to burn tokens", async function () {
    // minting tokens to account2
    const value = await ethers.BigNumber.from("100");
    const toWhom = this.account2.address;
    const mintReceipt = await this.ptc.mint(toWhom, value);
    expect((await checkEvent(mintReceipt, "Transfer", "from", "to", "value"))).to.be.true;
    // burning tokens from non-owner account, expecting revert
    await expectRevert(
      this.ptc.connect(this.account2).burn(toWhom, value),
      'VolmexPositionToken: must have burner role to burn'
    );
    // burning tokens from owner account, expecting success
    const burnReceipt = await this.ptc.burn(toWhom, value);
    expect((await checkEvent(burnReceipt, "Transfer", "from", "to", "value"))).to.be.true;
  });


  it("only the owner of the contract is able to pause the contract", async function () {
    await expectRevert(
      this.ptc.connect(this.account2).pause(),
      'VolmexPositionToken: must have pauser role to pause'
    );
    const receipt = await this.ptc.pause();
    expect((await checkEvent(receipt, "Paused", "account"))).to.be.true;
  });

  it("once the contract is paused no token can be transferred", async function () {
    //mint token
    /// setting up variables
    const mintValue = await ethers.BigNumber.from("100");
    const transferValue = await ethers.BigNumber.from("50");
    const toWhom = this.account2.address;
    const transferee = this.account3.address;

    /// minting tokens
    const mintTeceipt = await this.ptc.connect(this.owner).mint(toWhom, mintValue);
    expect((await checkEvent(mintTeceipt, "Transfer", "from", "to", "value"))).to.be.true;
    
    //Transfer token to confirm that transfer fx is working fine
    const transferReceipt = await this.ptc.connect(this.account2).transfer(transferee, transferValue);
    expect((await checkEvent(transferReceipt, "Transfer", "from", "to", "value"))).to.be.true;
    
    //pause contract
    const pauseReceipt = await this.ptc.pause();
    expect((await checkEvent(pauseReceipt, "Paused", "account"))).to.be.true;
    
    //Transfer token to confirm it is failing
    await expectRevert(
      this.ptc.connect(this.account2).transfer(transferee, transferValue),
      "ERC20Pausable: token transfer while paused"
    );
  });

  it("once the contract is paused no token can be minted", async function () {
    //mint token
    /// setting up variables
    const mintValue = await ethers.BigNumber.from("100");
    const toWhom = this.account2.address;

    /// minting tokens
    const mintTeceipt = await this.ptc.connect(this.owner).mint(toWhom, mintValue);
    expect((await checkEvent(mintTeceipt, "Transfer", "from", "to", "value"))).to.be.true;
    
    //pause contract
    const pauseReceipt = await this.ptc.pause();
    expect((await checkEvent(pauseReceipt, "Paused", "account"))).to.be.true;
    
    //minting again
    await expectRevert(
      this.ptc.mint(toWhom, mintValue),
      "ERC20Pausable: token transfer while paused"
    );
  });

  it("once the contract is paused no token can be burned", async function () {
    //mint token
    /// setting up variables
    const mintValue = await ethers.BigNumber.from("100");
    const toWhom = this.account2.address;

    /// minting tokens
    const mintTeceipt = await this.ptc.mint(toWhom, mintValue);
    expect((await checkEvent(mintTeceipt, "Transfer", "from", "to", "value"))).to.be.true;
    
    //pause contract
    const pauseReceipt = await this.ptc.pause();
    expect((await checkEvent(pauseReceipt, "Paused", "account"))).to.be.true;
    
    //burning tokens, expecting revert
    await expectRevert(
      this.ptc.burn(toWhom, mintValue),
      "ERC20Pausable: token transfer while paused"
    );
  });
});

describe("Protocol Token contract", function () {
  /**
   * SCOPE OF THE TEST FOR THE POSITION TOKEN CONTRACT
   * 1. contract is successfully deployed
   * 2. on deployment the contract is active
   * 3. on deployment the constructor arguments are successfully stored
   * 4. only the owner can toggle the contract's active status
   * 5. only the owner can change the minimum collateral qty
   * 6. only the owner can change the positionTokenContractAddress
   * 7. anyone can collateral to the protocol
   * 8. collateralize function can only be called when the contract is active
   * 9. for calling the collateral function the minimum collateral quantity is required
   * 10. only the acceptableCollateralCoin is used in the collateralize function
   * 10. 
   * 11. 
   */

  
});

