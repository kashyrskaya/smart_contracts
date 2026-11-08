import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

async function deployTokenFixture() {
  const [deployer, user1, user2] = await ethers.getSigners();
  const initialSupply = ethers.parseEther("1000000");

  const myToken = await ethers.deployContract("MyToken", [initialSupply]);
  return { myToken, deployer, user1, user2, initialSupply };
}

describe("MyToken", function () {
  describe("Deployment", function () {
    it("Should set the correct token name, symbol, and decimals", async function () {
      const { myToken } = await networkHelpers.loadFixture(deployTokenFixture);

      expect(await myToken.name()).to.equal("MyToken");
      expect(await myToken.symbol()).to.equal("MTK");
      expect(await myToken.decimals()).to.equal(18);
    });

    it("Should set the deployer as the owner", async function () {
      const { myToken, deployer } = await networkHelpers.loadFixture(deployTokenFixture);

      expect(await myToken.owner()).to.equal(deployer.address);
    });

    it("Should assign the total supply to the deployer", async function () {
      const { myToken, deployer, initialSupply } = await networkHelpers.loadFixture(deployTokenFixture);

      expect(await myToken.totalSupply()).to.equal(initialSupply);
      expect(await myToken.balanceOf(deployer.address)).to.equal(initialSupply);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens and update balance & total supply", async function () {
      const { myToken, deployer, user1, initialSupply } = await networkHelpers.loadFixture(deployTokenFixture);
      const mintAmount = ethers.parseEther("50000");

      await expect(myToken.connect(deployer).mint(user1.address, mintAmount))
        .to.emit(myToken, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);

      expect(await myToken.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await myToken.totalSupply()).to.equal(initialSupply + mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const { myToken, user1 } = await networkHelpers.loadFixture(deployTokenFixture);
      const mintAmount = ethers.parseEther("50000");

      await expect(
        myToken.connect(user1).mint(user1.address, mintAmount)
      )
        .to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("Should revert when minting to the zero address", async function () {
      const { myToken, deployer } = await networkHelpers.loadFixture(deployTokenFixture);
      const mintAmount = ethers.parseEther("1000");

      await expect(
        myToken.connect(deployer).mint(ethers.ZeroAddress, mintAmount)
      )
        .to.be.revertedWithCustomError(myToken, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });
  });

  describe("Transfer", function () {
    describe("transfer", function () {
      it("Should transfer tokens between accounts and emit Transfer event", async function () {
        const { myToken, deployer, user1, initialSupply } = await networkHelpers.loadFixture(deployTokenFixture);
        const transferAmount = ethers.parseEther("100");

        await expect(myToken.connect(deployer).transfer(user1.address, transferAmount))
          .to.emit(myToken, "Transfer")
          .withArgs(deployer.address, user1.address, transferAmount);

        expect(await myToken.balanceOf(deployer.address)).to.equal(initialSupply - transferAmount);
        expect(await myToken.balanceOf(user1.address)).to.equal(transferAmount);
      });

      it("Should revert when sender has insufficient balance", async function () {
        const { myToken, user1, user2 } = await networkHelpers.loadFixture(deployTokenFixture);
        const transferAmount = ethers.parseEther("1");

        await expect(
          myToken.connect(user1).transfer(user2.address, transferAmount)
        )
          .to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance")
          .withArgs(user1.address, 0n, transferAmount);
      });
    });

    describe("transferFrom", function () {
      it("Should transfer tokens with allowance, decrease allowance, and emit Transfer event", async function () {
        const { myToken, deployer, user1, user2, initialSupply } = await networkHelpers.loadFixture(deployTokenFixture);
        const approveAmount = ethers.parseEther("500");
        const transferAmount = ethers.parseEther("200");

        await expect(myToken.connect(deployer).approve(user1.address, approveAmount))
          .to.emit(myToken, "Approval")
          .withArgs(deployer.address, user1.address, approveAmount);

        expect(await myToken.allowance(deployer.address, user1.address)).to.equal(approveAmount);

        await expect(
          myToken.connect(user1).transferFrom(deployer.address, user2.address, transferAmount)
        )
          .to.emit(myToken, "Transfer")
          .withArgs(deployer.address, user2.address, transferAmount);

        expect(await myToken.balanceOf(deployer.address)).to.equal(initialSupply - transferAmount);
        expect(await myToken.balanceOf(user2.address)).to.equal(transferAmount);
        expect(await myToken.allowance(deployer.address, user1.address)).to.equal(approveAmount - transferAmount);
      });

      it("Should revert when spender exceeds allowance", async function () {
        const { myToken, deployer, user1, user2 } = await networkHelpers.loadFixture(deployTokenFixture);
        const approveAmount = ethers.parseEther("50");
        const transferAmount = ethers.parseEther("100");

        await myToken.connect(deployer).approve(user1.address, approveAmount);

        await expect(
          myToken.connect(user1).transferFrom(deployer.address, user2.address, transferAmount)
        )
          .to.be.revertedWithCustomError(myToken, "ERC20InsufficientAllowance")
          .withArgs(user1.address, approveAmount, transferAmount);
      });

      it("Should revert when spender transfers without any allowance", async function () {
        const { myToken, deployer, user1, user2 } = await networkHelpers.loadFixture(deployTokenFixture);
        const transferAmount = ethers.parseEther("10");

        await expect(
          myToken.connect(user1).transferFrom(deployer.address, user2.address, transferAmount)
        )
          .to.be.revertedWithCustomError(myToken, "ERC20InsufficientAllowance")
          .withArgs(user1.address, 0n, transferAmount);
      });

      it("Should revert when owner has insufficient balance despite sufficient allowance", async function () {
        const { myToken, user1, user2 } = await networkHelpers.loadFixture(deployTokenFixture);
        const amount = ethers.parseEther("50");

        await myToken.connect(user1).approve(user2.address, amount);

        await expect(
          myToken.connect(user2).transferFrom(user1.address, user2.address, amount)
        )
          .to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance")
          .withArgs(user1.address, 0n, amount);
      });

      it("Should revert when transferring to the zero address via transferFrom", async function () {
        const { myToken, deployer, user1 } = await networkHelpers.loadFixture(deployTokenFixture);
        const amount = ethers.parseEther("50");

        await myToken.connect(deployer).approve(user1.address, amount);

        await expect(
          myToken.connect(user1).transferFrom(deployer.address, ethers.ZeroAddress, amount)
        )
          .to.be.revertedWithCustomError(myToken, "ERC20InvalidReceiver")
          .withArgs(ethers.ZeroAddress);
      });
    });
  });
});
