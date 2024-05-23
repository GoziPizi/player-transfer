const { expect } = require("chai");
const { ethers } = require("hardhat");
const NOT_OWNER_MSG = "Address not authorized."
const newContractDate = Date.now() + (365 * 24 * 60 * 60 * 1000)

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
      let authorizedBudget = 500000
      beforeEach(async function() {
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, authorizedBudget);
      })

      it("Should fail if player address invalid", async function () {
        await expect(ftm.connect(clubA).makeOffer(ethers.constants.AddressZero, 100, 100, newContractDate)
          ).to.be.revertedWith("Player address invalid.");
      });

      it("Should fail if player is free agent", async function () {
        await expect(ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate)
          ).to.be.revertedWith("Player has no active contract.");
      });

      it("Should fail if exceeded authorized budget", async function () {
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        await expect(ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: authorizedBudget + 1 })
          ).to.be.revertedWith("Authorized budget limit exceeded.");
      });

      it("Should fail if transfer fee below minimum", async function () {
        let minimumTransferFee = 50;
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, 100, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        await expect(ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee - 1 })
          ).to.be.revertedWith("Offered transfer fee is below minimum transfer fee.");
      });

      it("Should create offer with correct properties after execution", async function () {
        let minimumTransferFee = 50;
        let newMinimumTransferFee = 75;
        let newSalary = 100;
        let date = newContractDate;
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, minimumTransferFee, newContractDate);
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

      it("Should send funds from club", async function() {
        let initClubBalance = await ethers.provider.getBalance(clubA.address);

        let transferFee = 500000;
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, transferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: transferFee });

        let finalClubBalance = await ethers.provider.getBalance(clubA.address);

        expect(initClubBalance.sub(finalClubBalance)).to.be.above(transferFee)
      })

      it("Should receive funds (contract)", async function() {
        const initContractBalance = await ethers.provider.getBalance(ftm.address);

        let transferFee = 500000;
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, transferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: transferFee });

        const finalContractBalance = await ethers.provider.getBalance(ftm.address);

        expect(finalContractBalance.sub(initContractBalance)).to.equal(transferFee)
      })
    });

    describe("  - makeOfferForFreeAgent", function() {
      it("Should fail if player address invalid", async function () {
        await expect(ftm.connect(clubA).makeOfferForFreeAgent(ethers.constants.AddressZero, 100, 100, newContractDate)
          ).to.be.revertedWith("Player address invalid.");
      });

      it("Should fail if player is not free agent", async function () {
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await expect(ftm.connect(clubA).makeOfferForFreeAgent(playerA.address, 100, 100, newContractDate)
          ).to.be.revertedWith("Player is not free agent.");
      });

      it("Should create offer with correct properties after execution", async function () {
        let newMinimumTransferFee = 75;
        let newSalary = 100;
        let date = newContractDate;

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
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
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
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
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
        await ftm.connect(clubA).makeOfferForFreeAgent(playerA.address, 100, 100, newContractDate);
        await ftm.connect(clubA).withdrawOfferForFreeAgent(playerA.address); 
        let offer = await ftm.getOfferForFreeAgent(playerA.address, clubA.address);

        // await expect(offer.clubAdress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
      })
    });

    describe("  - clubValidateOffer", function() {
      it("Should fail if offer does not exist", async function () {
        await expect(ftm.connect(clubA).clubValidateOffer(playerA.address, clubB.address)
          ).to.be.revertedWith("Offer does not exist.");
      });

      it("Should fail if another club tries to validate", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);

        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
        
        await expect(ftm.connect(clubC).clubValidateOffer(playerA.address, clubA.address))
          .to.be.revertedWith("Club not authorized to validate this offer.")
      })

      it("Should update offer correctly after execution", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);

        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubA.address)
        let offer = await ftm.getOffer(playerA.address, clubA.address);

        expect(offer.oldClubSigned).to.equal(true);
      })
    });

    describe("  - clubDeclineOffer", function() {
      it("Should fail if offer does not exist", async function () {
        await expect(ftm.connect(clubA).clubDeclineOffer(playerA.address, clubB.address)
          ).to.be.revertedWith("Offer does not exist.");
      });

      it("Should fail if another club tries to decline", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);

        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
        
        await expect(ftm.connect(clubC).clubDeclineOffer(playerA.address, clubA.address))
          .to.be.revertedWith("Club not authorized to decline this offer.")
      })

      it("Should clear offer after execution", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);

        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
        await ftm.connect(clubB).clubDeclineOffer(playerA.address, clubA.address)
        let offer = await ftm.getOffer(playerA.address, clubA.address);

        await expect(offer.oldClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.newClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.transferFee).to.equal(0);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
        await expect(offer.oldClubSigned).to.equal(false);
      })

    it("Should update buying club balance after execution", async function() {
        let minimumTransferFee = 50;
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);

        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, newContractDate);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, newContractDate, { value: minimumTransferFee });
        await ftm.connect(clubB).clubDeclineOffer(playerA.address, clubA.address)
        let balance = await ftm.getBalanceOf(clubA.address);

        await expect(balance).to.equal(minimumTransferFee)
      })

    });
  });

  describe("- Player methods", function () {
    describe("  - playerValidateOffer", function() {
      let minimumTransferFee = 50;
      let date = Date.now() + 10000;

      beforeEach(async function() {
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);
        await ftm.connect(owner).setClubAuthorizedBudget(clubB.address, 100);
        await ftm.connect(owner).setClubAuthorizedBudget(clubC.address, 100);
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, date);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, date, { value: minimumTransferFee });
      });

      it("Should fail if current club hasn't signed the offer", async function() {
        await expect(ftm.connect(playerA).playerValidateOffer(clubA.address)
          ).to.be.revertedWith("Current club signature missing.");
      });

      it("Should fail if current club's address is not the one in the offer", async function() {
        await ftm.connect(clubC).makeOffer(playerA.address, 100, 100, Date.now()+100, { value: minimumTransferFee });
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubA.address);
        await ftm.connect(playerA).playerValidateOffer(clubA.address);
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubC.address);

        await expect(ftm.connect(playerA).playerValidateOffer(clubC.address)
          ).to.be.revertedWith("Current club address mismatch.");
      });

      it("Should update old club balance after execution", async function() {
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubA.address);
        await ftm.connect(playerA).playerValidateOffer(clubA.address);
        expect(await ftm.getBalanceOf(clubB.address)).to.equal(minimumTransferFee);
      });

      it("Should update authorized budgets after execution", async function() {
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubA.address);
        await ftm.connect(playerA).playerValidateOffer(clubA.address);
        expect(await ftm.getClubAuthorizedBudget(clubA.address)).to.equal(100 - minimumTransferFee);
        expect(await ftm.getClubAuthorizedBudget(clubB.address)).to.equal(100 + minimumTransferFee);

      });

      it("Should create contract with correct properties after execution", async function() {
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubA.address);
        await ftm.connect(playerA).playerValidateOffer(clubA.address);
        let contract = await ftm.getPlayerContract(playerA.address);

        await expect(contract.clubAddress).to.equal(clubA.address);
        await expect(contract.playerAddress).to.equal(playerA.address);
        await expect(contract.minTransferFee).to.equal(100);
        await expect(contract.salary).to.equal(100);
        await expect(contract.endDate).to.equal(date);

      });

      it("Should clear offer after execution", async function() {
        await ftm.connect(clubB).clubValidateOffer(playerA.address, clubA.address);
        await ftm.connect(playerA).playerValidateOffer(clubA.address);

        let offer = await ftm.getOffer(playerA.address, clubA.address)

        await expect(offer.oldClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.newClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.transferFee).to.equal(0);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
        await expect(offer.oldClubSigned).to.equal(false);
      });

    });

    describe(" - playerValidateOfferForFreeAgent", function() {
      it("Should create contract with correct properties after execution", async function() {
        let date = Date.now() + 10000;
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, date);          
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        let contract = await ftm.getPlayerContract(playerA.address);

        await expect(contract.clubAddress).to.equal(clubB.address);
        await expect(contract.playerAddress).to.equal(playerA.address);
        await expect(contract.minTransferFee).to.equal(100);
        await expect(contract.salary).to.equal(100);
        await expect(contract.endDate).to.equal(date);
      });

      it("Should clear offer after execution", async function() {
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, Date.now());          
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);

        let offer = await ftm.getOfferForFreeAgent(playerA.address, clubB.address);

        await expect(offer.clubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
      });
    });

    describe(" - playerDeclineOffer", function() {
      let date = Date.now() + 10000;
      let minimumTransferFee = 50;

      beforeEach(async function() {
        await ftm.connect(owner).setClubAuthorizedBudget(clubA.address, 100);
        await ftm.connect(owner).setClubAuthorizedBudget(clubB.address, 100);
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, minimumTransferFee, minimumTransferFee, date);
        await ftm.connect(playerA).playerValidateOfferForFreeAgent(clubB.address);
        await ftm.connect(clubA).makeOffer(playerA.address, 100, 100, date, { value: minimumTransferFee });
        await ftm.connect(playerA).playerDeclineOffer(clubA.address);
      });

      it("Should update new club balance", async function() {
        expect(await ftm.getClubAuthorizedBudget(clubA.address)).to.equal(100);
      });

      it("Should clear offer after execution", async function() {
        let offer = await ftm.getOffer(playerA.address, clubA.address)

        await expect(offer.oldClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.newClubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.transferFee).to.equal(0);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
        await expect(offer.oldClubSigned).to.equal(false);
      });
    });

    describe(" - playerDeclineOfferForFreeAgent", function() {
      it("Should clear offer after execution", async function() {
        await ftm.connect(clubB).makeOfferForFreeAgent(playerA.address, 100, 100, Date.now());          
        await ftm.connect(playerA).playerDeclineOfferForFreeAgent(clubB.address);

        let offer = await ftm.getOfferForFreeAgent(playerA.address, clubB.address);

        await expect(offer.clubAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.playerAddress).to.equal(ethers.constants.AddressZero);
        await expect(offer.contractMinTransferFee).to.equal(0);
        await expect(offer.contractSalary).to.equal(0);
        await expect(offer.contractEndDate).to.equal(0);
      });
    });
  });
});


