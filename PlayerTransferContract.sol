// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PlayerTransferContract {
    address public owner;

    string public standard;
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    constructor() {
        owner = msg.sender;
        standard = "Token 0.1";
        name = "Player Transfer Token";
        symbol = "PTT";
    }

    mapping(address => uint256) public balanceOf;

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
        uint256 transferFee;
        uint256 salary;
        uint256 contractStartDate;
        uint256 contractEndDate;
    }

    struct ClubOfferForFreePlayer {
        address clubAddress;
        address playerAddress;
        uint256 salary;
        uint256 contractEndDate;
    }

    struct PlayerExchange {
        address oldClubAddress;
        address newClubAddress;
        address playerAddress;
        uint256 transferFee;
        uint256 salary;
        uint256 contractEndDate;
        bool oldClubSigned;
    }

    //player related methods

    /**
        * Player can accept the offer from the club
        * Conditions for accepting the offer:
        The player must have a contract offer from this specific club
        The method must be called by the player
     */
    function acceptOfferFromFreePlayer(address clubAddress) public {}

    /**
        * Player can accept the transfer from the club
        * Conditions for accepting the offer:
        The player must have a contract offer from this specific club
        The method must be called by the player
        The oldClub must have signed the contract
     */
    function acceptTransferFromClub(address newClubAddress) public {}

    /**
        Decline the offer from the club
        Conditions for declining the offer:
        The player must have a contract offer from this specific club
     */
    function declineOfferFromClub(address clubAddress) public {}

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
        uint256 contractEndDate
    ) public {}

    /**
        * Withdraw the offer to a free player
        * Conditions for withdrawing the offer:
        The offer must exist
     */
    function withdrawOfferToFreePlayer(address playerAddress) public {}

    /**
        * Make an offer to a player
        * Conditions for making an offer:
        The player must exist
        The player must be under contract
        The method must be called with the right amount of ether
     */
    function makeTransferOffer(
        address playerAddress,
        uint256 transferFee,
        uint256 salary,
        uint256 contractEndDate
    ) public payable {}

    /**
        * Withdraw the offer to a player
        * Conditions for withdrawing the offer:
        The offer must exist
     */
    function withdrawTransferOffer(address playerAddress) public {}

    /**
        * Sign the contract with the player
        * Conditions for signing the contract:
        The offer must exist
        The method must be called by the club which owns the player
     */
    function signTransferContract(address playerAddress) public {}
}
