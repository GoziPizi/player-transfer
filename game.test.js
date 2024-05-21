const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Game contract", function () {
  let Game;
  let game;
  let owner;
  let tokenHolder;
  let addr2;
  let secret;
  let newSecret;
  let secret32;
  let newSecret32;
  let secretHash;
  let newSecretHash;
  let lockedFundsAmount;

  beforeEach(async function () {
    Game = await ethers.getContractFactory("Game");
    [owner, tokenHolder, addr2] = await ethers.getSigners();

    game = await Game.deploy();
    await game.deployed();

    secret = "secret";
    secret32 = ethers.utils.formatBytes32String(secret);
    secretHash = ethers.utils.keccak256(secret32);
    newSecret = "newSecret";
    newSecret32 = ethers.utils.formatBytes32String(newSecret);
    newSecretHash = ethers.utils.keccak256(newSecret32);

    lockedFundsAmount = 200000;
  });
/*
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await game.getOwner()).to.equal(owner.address);
    });

    it("Should initialize with no locked funds and token not initialized", async function () {
      expect(await game.getLocked()).to.equal(false);
      expect(await game.getTokenInitialized()).to.equal(false);
    });
  });

  describe("Fail tests: pre lockFunds", function() {
    it("Should revert if initToken() called before funds locked", async function () {
      await expect(
        game.connect(owner).initToken()
      ).to.be.revertedWith("Funds are not locked.");
    })

    it("Should revert if giveToken() called before funds locked", async function () {
      await expect(
        game.connect(owner).giveToken(tokenHolder.address)
      ).to.be.revertedWith("Token is not initialized.");
    })

    it("Should revert if guess() called before funds locked", async function () {
      await expect(
        game.connect(tokenHolder).guess(secret32, lockedFundsAmount, newSecretHash)
      ).to.be.revertedWith("Token is not held.");
    })
  });

  describe("Fail tests: lockFunds", function() {
    it("Should revert if lockFunds() called by not owner", async function () {
      await expect(
        game.connect(tokenHolder).lockFunds(secretHash, { value: lockedFundsAmount })
      ).to.be.revertedWith("Caller is not owner.");
    })

    it("Should revert if lockFunds() funds to lock not greater than 0", async function () {
      await expect(
        game.connect(owner).lockFunds(secretHash, { value: 0 })
      ).to.be.revertedWith("Funds amount to lock is not greater than 0.");
    })
  })

  describe("lockFunds", function() {
    it("Should activate locked state after funds locked", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      expect(await game.getLocked()).to.equal(true);
    })

    it("Should set secret hash after funds locked", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      expect(await game.getSecretHash()).to.equal(secretHash);
    })

    it("Should add locked funds to the wallet's balance after funds locked", async function () {
      let initBalance = await ethers.provider.getBalance(game.address);
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      let currentBalance = await ethers.provider.getBalance(game.address);
      expect(currentBalance.sub(initBalance)).to.equal(lockedFundsAmount);
    })
  })

  describe("Fail tests: post lockFunds", function() {
    it("Should revert if lockFunds called after funds locked", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await expect(
        game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount })
      ).to.be.revertedWith("Funds are already locked.")
    })
  })

  describe("Fail tests: pre initToken", function() {
    it("Should revert if giveToken() called before token initialized", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await expect(
        game.connect(owner).giveToken(tokenHolder.address)
      ).to.be.revertedWith("Token is not initialized.")
    })

    it("Should revert if guess() called before token initialized", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await expect(
        game.connect(tokenHolder).guess(secret32, lockedFundsAmount, newSecretHash)
      ).to.be.revertedWith("Token is not held.")
    })
  })

  describe("Fail tests: initToken", function() {
    it("Should revert if initToken() called by not owner", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await expect(
        game.connect(tokenHolder).initToken()
      ).to.be.revertedWith("Caller is not owner.")
    })
  })

  describe("initToken", function() {
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.initToken();
    });

    it("Should be at locked state after token initialized", async function () {
      expect(await game.getLocked()).to.equal(true);
    })

    it("Should be at token initialized state after token initialized", async function () {
      expect(await game.getTokenInitialized()).to.equal(true);
    })

    it("Should set token to owner after token initialized", async function () {
      expect(await game.getTokenHolderAddress()).to.equal(owner.address)
    })
  })

  describe("Fail tests: post initToken", function() {
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
    });

    it("Should revert if lockFunds() called after token initialized", async function () {
      await expect(
        game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount })
      ).to.be.revertedWith("Funds are already locked.")
    })

    it("Should revert if initToken() called after token initialized", async function () {
      await expect(
        game.connect(owner).initToken()
      ).to.be.revertedWith("Token is already initialized.")
    })
  })

  describe("Fail tests: pre giveToken", function() {
    it("Should revert if guess() called before token given", async function () {
      await expect(
        game.connect(tokenHolder).guess(secret32, lockedFundsAmount, newSecretHash)
      ).to.be.revertedWith("Token is not held.")
    })
  })

  describe("Fail tests: giveToken", function() {
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
    });

    it("Should revert if giveToken() called by not owner", async function () {
      await expect(
        game.connect(tokenHolder).giveToken(tokenHolder.address)
      ).to.be.revertedWith("Caller is not owner.")
    })

    it("Should revert if giveToken() sets token to address 0", async function() {
      await expect(
        game.connect(owner).giveToken(ethers.constants.AddressZero)
      ).to.be.revertedWith("Token can not be given to address 0.")
    })
  })

  describe("giveToken", function() {
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
      await game.connect(owner).giveToken(tokenHolder.address);
    });

    it("Should be at locked state after token given", async function () {
      expect(await game.getLocked()).to.equal(true);
    })

    it("Should activate token initialized state after token given", async function () {
      expect(await game.getTokenInitialized()).to.equal(true);
    })

    it("Should set token to holder after token given", async function () {
      expect(await game.getTokenHolderAddress()).to.equal(tokenHolder.address)
    })
  })

  describe("Fail tests: post giveToken", function() {
    it("Should revert if giveToken() gives token to same holder", async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
      await game.connect(owner).giveToken(tokenHolder.address);
      await expect(
        game.connect(owner).giveToken(tokenHolder.address)
      ).to.be.revertedWith("Token can not be given to same holder.")
    })
  })
  
  describe("Fail tests: guess", function() {
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
    });

    it("Should revert if guess() called by owner", async function () {
      await expect(
        game.connect(owner).guess(secret32, lockedFundsAmount, newSecretHash)
      ).to.be.revertedWith("Token is not held.")
    })

    it("Should revert if guess() called by non holder", async function () {
      await game.connect(owner).giveToken(tokenHolder.address);
      await expect(
        game.connect(addr2).guess(secret32, lockedFundsAmount, newSecretHash)
      ).to.be.revertedWith("User doesn't have token.")
    })

    it("Should revert if guess() called with wrong secret", async function () {
      await game.connect(owner).giveToken(tokenHolder.address);
      await expect(
        game.connect(tokenHolder).guess(ethers.utils.formatBytes32String("wrongSecret"), lockedFundsAmount, newSecretHash)
      ).to.be.revertedWith("Incorrect secret.")
    })

    // !!!
    it("Should revert if guess() fund request too high", async function () {
      await game.connect(owner).giveToken(tokenHolder.address);
      await expect(
        game.connect(tokenHolder).guess(
          secret32, 
          lockedFundsAmount * 2, 
          newSecretHash)
      ).to.be.reverted
    })
  })

  describe("guess", function() {
    let initContractBalance, initGuesserBalance, gasCost;
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      initContractBalance = await ethers.provider.getBalance(game.address);
      initGuesserBalance = await ethers.provider.getBalance(tokenHolder.address);
      await game.connect(owner).initToken();
      await game.connect(owner).giveToken(tokenHolder.address);
      const tx = await game.connect(tokenHolder).guess(secret32, lockedFundsAmount, newSecretHash);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      const gasPrice = tx.gasPrice;
      gasCost = gasUsed.mul(gasPrice);
    });

    it("Should update contract's wallet's balance", async function() {
      let contractBalance = await ethers.provider.getBalance(game.address);
      expect(
        contractBalance
      ).to.equal(
        initContractBalance.sub(lockedFundsAmount)
      );
    })

    // WARNING ==> THE TRANSACTION AMOUNT MUST BE HIGH ENOUGH FOR IT NOT TO BE CANCELLED BY THE GAS COST
    it("Should update guesser's wallet's balance", async function() {
      let guesserBalance = await ethers.provider.getBalance(tokenHolder.address);
      // expect(
      //   guesserBalance
      // ).to.equal(
      //   initGuesserBalance.add(lockedFundsAmount).sub(gasCost)
      // );
      expect(guesserBalance).to.be.above(initGuesserBalance);
    })

    it("Should update secret", async function() {
      expect(await game.getSecretHash()).to.equal(newSecretHash);
    })
  });

  describe("Fail tests: post guess", function() {
    beforeEach(async function () {
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
      await game.connect(owner).giveToken(tokenHolder.address);
      await game.connect(tokenHolder).guess(secret32, lockedFundsAmount, newSecretHash);
    });

    it("Should revert if lockFunds() called after guess", async function() {
      expect(game.connect(owner).lockFunds(newSecretHash, { value: lockedFundsAmount })
      ).to.be.revertedWith("Funds are already locked.");
    })

    it("Should revert if initToken() called after guess", async function() {
      expect(game.connect(owner).initToken()
      ).to.be.revertedWith("Token is already initialized.");
    })
  });
  */

  describe("New guess", function() {
    let initSecondGuesserBalance;
    beforeEach(async function() {
      initSecondGuesserBalance = await ethers.provider.getBalance(addr2.address);
      await game.connect(owner).lockFunds(secretHash, { value: lockedFundsAmount });
      await game.connect(owner).initToken();
      await game.connect(owner).giveToken(tokenHolder.address);
      await game.connect(tokenHolder).guess(secret32, lockedFundsAmount / 2, newSecretHash);
      await game.connect(owner).giveToken(addr2.address);
      await game.connect(addr2).guess(newSecret32, lockedFundsAmount / 2, secretHash);
    })

    it("Should update guesser's wallet's balance", async function() {
      let secondGuesserBalance = await ethers.provider.getBalance(addr2.address);
      // expect(
      //   guesserBalance
      // ).to.equal(
      //   initGuesserBalance.add(lockedFundsAmount).sub(gasCost)
      // );
      expect(secondGuesserBalance).to.be.above(initSecondGuesserBalance);
    })

    it("Should secret after second guess", async function() {
      expect(await game.getSecretHash()).to.equal(secretHash)
    })

  })
});