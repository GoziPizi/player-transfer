// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PlayerTransferContract {
    address public owner;

    string public standard;
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    uint256 public seasonBudget;

    constructor() {
        owner = msg.sender;
        standard = "Token 0.1";
        name = "Player Transfer Token";
        symbol = "PTT";
    }

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public seasonBudgetOfClub;

    mapping(address => Contract) public playerContract;

    //ClubOfferForFreePlayer[clubAddress][playerAddress]
    mapping(address => mapping(address => ClubOfferForFreePlayer))
        public clubOfferForFreePlayer;
    mapping(address => mapping(address => ClubOfferForTakenPlayer))
        public clubOfferForTakenPlayer;
    function withdraw() public {
        /**
            * Withdraw the balance of the contract
            * Conditions for a withdrawal:
            The contract must have a balance
            The contract must be called by the owner
        */
        uint256 amount = balanceOf[msg.sender];
        balanceOf[msg.sender] = 0;
        if (!payable(msg.sender).send(amount)) {
            balanceOf[msg.sender] = amount;
        }
    }

    struct Contract {
        address clubAdress;
        address playerAdress;
        uint256 liberationFee;
        uint256 salary;
        uint256 contractStartDate;
        uint256 contractEndDate;
    }

    struct ClubOfferForFreePlayer {
        address clubAddress;
        address playerAddress;
        uint256 salary;
        uint256 liberationFee;
        uint256 contractEndDate;
    }

    struct ClubOfferForTakenPlayer {
        address oldClubAddress;
        address newClubAddress;
        address playerAddress;
        uint256 liberationFee;
        uint256 newLiberationFee;
        uint256 salary;
        uint256 contractEndDate;
        bool oldClubSigned;
    }

    //player related methods

    /**
        * Player can accept the offer from the club
        * Conditions for accepting the offer:
        The player must not have a contract, or the contract must be expired
        The method must be called by the player
    */
    function acceptOfferFromFreePlayer(address clubAddress) public {
        Contract memory actualContract = playerContract[msg.sender];
        require(
            actualContract.playerAdress == address(0) ||
                actualContract.contractEndDate < block.timestamp
        );
        ClubOfferForFreePlayer memory offer = clubOfferForFreePlayer[
            clubAddress
        ][msg.sender];
        require(offer.playerAddress == msg.sender);
        playerContract[msg.sender] = Contract(
            offer.clubAddress,
            offer.playerAddress,
            offer.liberationFee,
            offer.salary,
            block.timestamp,
            offer.contractEndDate
        );
        clubOfferForFreePlayer[clubAddress][
            msg.sender
        ] = ClubOfferForFreePlayer(address(0), address(0), 0, 0, 0);
    }

    /**
        * Player can accept the transfer from the club
        * Conditions for accepting the offer:
        The method must be called by the player
        The oldClub must have signed the contract
    */
    function acceptTransferFromClub(address newClubAddress) public {
        Contract memory actualContract = playerContract[msg.sender];
        require(
            actualContract.playerAdress != address(0) &&
                actualContract.contractEndDate > block.timestamp
        );
        ClubOfferForTakenPlayer memory offer = clubOfferForTakenPlayer[
            msg.sender
        ][newClubAddress];
        require(offer.playerAddress == msg.sender);
        require(offer.oldClubSigned);
        require(seasonBudgetOfClub[newClubAddress] >= offer.newLiberationFee);
        seasonBudgetOfClub[newClubAddress] -= offer.newLiberationFee;
        seasonBudgetOfClub[offer.oldClubAddress] += offer.liberationFee;
        playerContract[msg.sender] = Contract(
            offer.newClubAddress,
            offer.playerAddress,
            offer.newLiberationFee,
            offer.salary,
            block.timestamp,
            offer.contractEndDate
        );
        clubOfferForTakenPlayer[msg.sender][
            newClubAddress
        ] = ClubOfferForTakenPlayer(
            address(0),
            address(0),
            address(0),
            0,
            0,
            0,
            0,
            false
        );
    }

    /**
        Decline the offer from the club
        Conditions for declining the offer:
        The player must have a contract offer from this specific club
    */
    function declineOfferFromClub(address clubAddress) public {
        ClubOfferForFreePlayer memory offer = clubOfferForFreePlayer[
            clubAddress
        ][msg.sender];
        require(offer.playerAddress == msg.sender);
        clubOfferForFreePlayer[clubAddress][
            msg.sender
        ] = ClubOfferForFreePlayer(address(0), address(0), 0, 0, 0);
        balanceOf[msg.sender] += offer.liberationFee;
    }

    //club related methods
    /**
        * Make an offer to a free player
        * Conditions for making an offer:
        The player must exist
        The player must not be under contract
    */
    function makeOfferToFreePlayer(
        address playerAddress,
        uint256 salary,
        uint256 liberationFee,
        uint256 contractEndDate
    ) public {
        Contract memory actualContract = playerContract[playerAddress];
        require(
            actualContract.playerAdress == address(0) ||
                actualContract.contractEndDate < block.timestamp
        );
        clubOfferForFreePlayer[msg.sender][
            playerAddress
        ] = ClubOfferForFreePlayer(
            msg.sender,
            playerAddress,
            salary,
            liberationFee,
            contractEndDate
        );
    }

    /**
        * Withdraw the offer to a free player
        * Conditions for withdrawing the offer:
        The offer must exist
     */
    function withdrawOfferToFreePlayer(address playerAddress) public {
        ClubOfferForFreePlayer memory offer = clubOfferForFreePlayer[
            msg.sender
        ][playerAddress];
        require(offer.playerAddress == playerAddress);
        clubOfferForFreePlayer[msg.sender][
            playerAddress
        ] = ClubOfferForFreePlayer(address(0), address(0), 0, 0, 0);
    }

    /**
        * Make an offer to a player
        * Conditions for making an offer:
        The player must exist
        The player must be under contract
        The method must be called with the right amount of ether
     */
    function makeTransferOffer(
        address playerAddress,
        uint256 newLiberationFee,
        uint256 salary,
        uint256 contractEndDate
    ) public payable {
        Contract memory actualContract = playerContract[playerAddress];
        require(
            actualContract.playerAdress != address(0) &&
                actualContract.contractEndDate > block.timestamp
        );
        require(msg.value >= actualContract.liberationFee);
        clubOfferForTakenPlayer[playerAddress][
            msg.sender
        ] = ClubOfferForTakenPlayer(
            actualContract.clubAdress,
            msg.sender,
            playerAddress,
            msg.value,
            newLiberationFee,
            salary,
            contractEndDate,
            false
        );
    }

    /**
        * Withdraw the offer to a player
        * Conditions for withdrawing the offer:
        The offer must exist
     */
    function withdrawTransferOffer(address playerAddress) public {
        ClubOfferForTakenPlayer memory offer = clubOfferForTakenPlayer[
            playerAddress
        ][msg.sender];
        require(offer.playerAddress == playerAddress);
        clubOfferForTakenPlayer[playerAddress][
            msg.sender
        ] = ClubOfferForTakenPlayer(
            address(0),
            address(0),
            address(0),
            0,
            0,
            0,
            0,
            false
        );
        balanceOf[msg.sender] += offer.liberationFee;
    }

    /**
        * Conditions for signing the contract:
        The offer must exist
        The method must be called by the club which owns the player
     */
    function signTransferContract(address playerAddress) public {
        ClubOfferForTakenPlayer memory offer = clubOfferForTakenPlayer[
            playerAddress
        ][msg.sender];
        require(offer.playerAddress == playerAddress);
        clubOfferForTakenPlayer[playerAddress][msg.sender].oldClubSigned = true;
    }

    //Called by the owner
    function setSeasonBudgetForClub(
        uint256 budget,
        address clubAddress
    ) public {
        require(msg.sender == owner);
        seasonBudgetOfClub[clubAddress] = budget;
    }
}
