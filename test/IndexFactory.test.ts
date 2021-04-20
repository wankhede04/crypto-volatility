const expectEvent = require("@openzeppelin/test-helpers/src/expectEvent");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
import { Signer, utils, Contract, ContractReceipt, Event } from 'ethers';
import { IndexFactory, IndexFactory__factory, TestCollateralToken, TestCollateralToken__factory, VolmexPositionToken, VolmexPositionToken__factory, VolmexProtocol, VolmexProtocol__factory } from '../types';
import { Result } from '@ethersproject/abi';

export const filterEvents = (blockEvents: ContractReceipt, name: String): Array<Event> => {
    return blockEvents.events?.filter(event => event.event === name) || [];
  }
  

export const decodeEvents = <T extends Contract>(token: T, events: Array<Event>): Array<Result> => {
    const decodedEvents = []
    for (const event of events) {
      const getEventInterface = token.interface.getEvent(event.event || '')
      decodedEvents.push(token.interface.decodeEventLog(getEventInterface, event.data))
    }
    return decodedEvents;
  }

describe("Index Factory", function () {
  let accounts: Signer[];
  let CollateralToken: TestCollateralToken;
  
  this.beforeAll(async function () {
    accounts = await ethers.getSigners();
  })

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

    const deployedIndex = await factory.createIndex(tokenToMakeIndexOf.address, CollateralToken.address, "20000000000000000000", "200",'Ethereum', 'ETH');
    
    const transaction = await deployedIndex.wait();

    const indexCreatedEvent = decodeEvents(factory, filterEvents(transaction, 'IndexCreated'))

    //@ts-ignore
    const address = indexCreatedEvent[0].index

    expect(address).not.equal(undefined)
    
    let instance: VolmexProtocol | null
    
    if(address !== undefined){    
      const { interface: contract_interface } = await ethers.getContractFactory('VolmexProtocol') as VolmexProtocol__factory;
      instance = new ethers.Contract(address, contract_interface, accounts[0])
      expect(await instance?.active()).to.equal(true)
    } else {
      instance = null;
    }
    expect(instance).not.equal(null)
  });

});
