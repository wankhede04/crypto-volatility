const expectEvent = require("@openzeppelin/test-helpers/src/expectEvent");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
import { Signer, utils } from 'ethers';
import { IndexFactory, IndexFactory__factory, TestCollateralToken, TestCollateralToken__factory, VolmexPositionToken, VolmexPositionToken__factory, VolmexProtocol, VolmexProtocol__factory } from '../types';

describe("Index Factory", function () {
  let accounts: Signer[];
  let CollateralToken: TestCollateralToken;
  
  it("should deploy index from a factory", async () => {

    // Deploy collateral token
    const CollateralTokenFactory = await ethers.getContractFactory("TestCollateralToken") as TestCollateralToken__factory;
    CollateralToken = await CollateralTokenFactory.deploy() as TestCollateralToken;
    await CollateralToken.deployed();
    
    // Deploy token to make an index of (real world example would be WETH)
    const PositionTokenContractFactory = await ethers.getContractFactory(
      "VolmexPositionToken"
    ) as VolmexPositionToken__factory;
    const tokenToMakeIndexOf = await PositionTokenContractFactory.deploy() as VolmexPositionToken;
    await tokenToMakeIndexOf.deployed();
    await tokenToMakeIndexOf.initialize("Uniswap", "UNI");

    const indexFactory = await ethers.getContractFactory('IndexFactory') as IndexFactory__factory;

    const factory = await indexFactory.deploy().then((f: IndexFactory) => f.deployed());

    const initFactoryTx = await factory.initialize();

    await initFactoryTx.wait()

    const deployedIndex = await factory.createIndex(tokenToMakeIndexOf.address, CollateralToken.address, "20000000000000000000", "200");
    
    const transaction = await deployedIndex.wait()
    const factoryEvents = transaction.events
    const { address } = factoryEvents?.find(Boolean) || {}

    expect(address).not.equal(undefined)
    let instance: VolmexProtocol | null
    
    if(address !== undefined){
      const { interface: contract_interface } = await ethers.getContractFactory('VolmexProtocol') as VolmexProtocol__factory;
      instance = new ethers.Contract(address, contract_interface, accounts[0]) as VolmexProtocol

      expect((await instance.volatilityCapRatio()).toNumber()).to.equal(200)
    } else {
      instance = null;
    }

    expect(instance).not.equal(null)
  });

});
