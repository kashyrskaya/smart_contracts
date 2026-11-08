import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers"; 

export default buildModule("MyTokenModule", (m) => {
    const initialSupply = ethers.parseEther("1000000");

    const myToken = m.contract("MyToken", [initialSupply]);

    return { myToken };
})