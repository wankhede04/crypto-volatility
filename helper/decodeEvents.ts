import { Event, utils } from "ethers";
import { Result } from "@ethersproject/abi";
import { Receipt, DeployResult } from "hardhat-deploy/types";
import { ContractReceipt, Event as EventOrig, Contract } from "ethers";

export const filterEvents = (
  blockEvents: Receipt,
  name: String
): Array<Event> => {
  return blockEvents.events?.filter((event) => event.event === name) || [];
};

export const decodeEvents = (
  deployFactory: DeployResult,
  events: Array<Event>,
  name: string
): Array<Result> => {
  const factoryInterface = new utils.Interface(deployFactory.abi);

  const decodedEvents = [];
  for (const event of events) {
    decodedEvents.push(
      factoryInterface.decodeEventLog(name, event.data, event.topics)
    );
  }

  return decodedEvents;
};

export const origFilterEvents = (
  blockEvents: ContractReceipt,
  name: String
): Array<Event> => {
  return blockEvents.events?.filter((event) => event.event === name) || [];
};

export const origDecodeEvents = <T extends Contract>(
  token: T,
  events: Array<EventOrig>
): Array<Result> => {
  const decodedEvents = [];
  for (const event of events) {
    const getEventInterface = token.interface.getEvent(event.event || "");
    decodedEvents.push(
      token.interface.decodeEventLog(
        getEventInterface,
        event.data,
        event.topics
      )
    );
  }
  return decodedEvents;
};
