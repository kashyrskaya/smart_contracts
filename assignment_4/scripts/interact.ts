import { network } from "hardhat";
import type { Address } from "viem";

const { viem } = await network.create({
  network: "sepolia"
});

const contractAddress: Address = "0xceD9DDcEFc98688a5Be68AA2Fa97B671eD1aD31d";

const greeter = await viem.getContractAt("Greeter", contractAddress);
const greeting = await greeter.read.greet();

console.log(greeting);