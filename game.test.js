const { expect } = require("chai");
const { ethers } = require("hardhat");
const NOT_OWNER_MSG = "Address not authorized."

describe("Football Transfer Management - smart contract", function () {
  let FootballTransferManagement;
  let ftm;
  let owner, clubA, clubB, clubC, playerA, playerB;


  beforeEach(async function () {
    FootballTransferManagement = await ethers.getContractFactory("PlayerTransferContract");
    [owner, clubA, clubB, clubC, playerA, playerB] = await ethers.getSigners();

    ftm = await FootballTransferManagement.deploy();
    await ftm.deployed();
  });

  // TODO : MAKE OFFER CHECK BALANCE OF CLUB AND WALLET

  describe("- Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ftm.getOwner()).to.equal(owner.address);
    });

    it("Should set the right standard", async function () {
      expect(await ftm.getStandard()).to.equal("Token 0.1");
    });

    it("Should set the right name", async function () {
      expect(await ftm.getName()).to.equal("Player Transfer Token");
    });

    it("Should set the right symbol", async function () {
      expect(await ftm.getSymbol()).to.equal("PTT");
    });
  });

  describe("- Owner methods", function () {
    describe("  - setClubAuthorizedBudget", function() {
      it("Should fail if sender not owner", async function () {
        await expect(ftm.connect(clubA).setClubAuthorizedBudget(clubA.address, 100)).to.be.revertedWith(NOT_OWNER_MSG);
      });

      it("Should update club budget after execution", async function () {
        let budget = 100;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, budget);
        expect(await ftm.getClubAuthorizedBudget(clubA.address)).to.equal(budget)
      });
    });
  });

  describe("- Club methods", function () {
    describe("  - makeOffer", function() {
      let authorizedBudget = 100
      beforeEach(async function() {
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, authorizedBudget);
      })

      it("Should fail if player address invalid", async function () {
        await expect(ftm.connect(clubA).makeOffer(ethers.constants.AddressZero, 100, 100, Date.now())
          ).to.be.revertedWith("Player address invalid.");
      });

      it("Should fail if player is free agent", async function () {
        await expect(ftm.connect(clubA).makeOffer(playerA.address, 100, 100, Date.now())
          ).to.be.revertedWith("Player has no active contract.");
      });

      it("Should fail if exceeded authorized budget", async function () {
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, Date.now());
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        await expect(ftm.connect(clubA).makeOffer(playerA.address, 100, 100, Date.now(), { value: authorizedBudget + 1 })
          ).to.be.revertedWith("Authorized budget limit exceeded.");
      });

      it("Should fail if transfer fee below minimum", async function () {
        let minimumTransferFee = 50;
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, 100, Date.now());
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        await expect(ftm.connect(clubA).makeOffer(playerA.address, 100, 100, Date.now(), { value: minimumTransferFee - 1 })
          ).to.be.revertedWith("Offered transfer fee is below minimum transfer fee.");
      });

      it("Should create offer with correct properties after execution", async function () {
        let minimumTransferFee = 50;
        let newMinimumTransferFee = 75;
        let newSalary = 100;
        let date = Date.now();
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, minimumTransferFee, Date.now());
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, newMinimumTransferFee, newSalary, date, { value: minimumTransferFee });
        let offer = await ftm.getOffer(playerA.address, clubA.address);

        await expect(offer.oldClubAddress).to.equal(clubB.address);
        await expect(offer.newClubAddress).to.equal(clubA.address);
        await expect(offer.playerAddress).to.equal(playerA.address);
        await expect(offer.transferFee).to.equal(minimumTransferFee);
        await expect(offer.contractMinTransferFee).to.equal(newMinimumTransferFee);
        await expect(offer.contractSalary).to.equal(newSalary);
        await expect(offer.contractEndDate).to.equal(date);
        await expect(offer.oldClubSigned).to.equal(false);
      });
    });

    describe("  - makeOfferForFreeAgent", function() {
      it("Should fail if player address invalid", async function () {
        await expect(ftm.connect(clubA).makeOfferForFreeAgent(ethers.constants.AddressZero, 100, 100, Date.now())
          ).to.be.revertedWith("Player address invalid.");
      });

      it("Should fail if player is not free agent", async function () {
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, Date.now());
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await expect(ftm.connect(clubA).makeOfferForFreeAgent(playerA.address, 100, 100, Date.now())
          ).to.be.revertedWith("Player is not free agent.");
      });

      it("Should create offer with correct properties after execution", async function () {
        let  = 50;
        let newMinimumTransferFee = 75;
        let newSalary = 100;
        let date = Date.now();

        await ftm.connect(clubA).makeOfferForFreeAgent(playerA.address, newSalary, newMinimumTransferFee, date);
        let offer = await ftm.getOfferForFreeAgent(playerA.address, clubA.address);

        await expect(offer.clubAddress).to.equal(clubA.address);
        await expect(offer.playerAddress).to.equal(playerA.address);
        await expect(offer.contractMinTransferFee).to.equal(newMinimumTransferFee);
        await expect(offer.contractSalary).to.equal(newSalary);
        await expect(offer.contractEndDate).to.equal(date);
      });
    });

    describe("  - withdrawOffer", function() {
      it("Should fail if offer does not exist", async function () {
        await expect(ftm.connect(clubA).withdrawOffer(playerA.address)
          ).to.be.revertedWith("Offer does not exist.");
      });

      it("Should clear offer after execution", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, Date.now());
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, Date.now(), { value: minimumTransferFee });
        await ftm.connect(clubA).withdrawOffer(playerA.address);
        let offer = await ftm.getOffer(playerA.address, clubA.address)

        await expect(offer.oldClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.newClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.transferFee).to.equal(0);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
        await expect(offer.oldClubSigned).to.equal(false);
      })

      it("Should update club balance after execution", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, Date.now());
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, Date.now(), { value: minimumTransferFee });
        await ftm.connect(clubA).withdrawOffer(playerA.address);

        expect(await ftm.getBalanceOf(clubA.address)).to.equal(minimumTransferFee);
      })
    });

    describe("  - withdrawOfferForFreeAgent", function() {
      it("Should fail if offer does not exist", async function () {
        await expect(ftm.connect(clubA).withdrawOfferForFreeAgent(playerA.address)
          ).to.be.revertedWith("Offer for free agent does not exist.");
      });

      it("Should clear offer after execution", async function() {
        await ftm.connect(clubA).makeOfferForFreeAgent(playerA.address, 100, 100, Date.now());
        await ftm.connect(clubA).withdrawOfferForFreeAgent(playerA.address); 
        let offer = await ftm.getOfferForFreeAgent(playerA.address, clubA.address);

        // await expect(offer.clubAdress).to.equal(ethers.constants.AddressZero);
        // await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
      })
    });
  });
});


