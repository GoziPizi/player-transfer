// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FootballContractManagement {
    
    struct Player {
        address id;
        string firstName;
        string lastName;
        uint256 birthDate;
    }

    struct Club {
        address id;
        string name;
        uint256 budget;
    }

    struct Contract {
        uint256 contractId;
        address playerId;
        address clubId;
        uint256 duration;
        uint256 salary;
        uint256 releaseClause;
        uint256 bonus;
        uint256 startTime;
        uint256 terminationDate;
    }

    struct Offer {
        uint256 offerId;
        uint256 transferFee;
        uint256 draftContractId;
        // Possible to get offering club AND player through draft contract

        // Possible to get current player's club through current contract?
        // if to complicated then just use the following:
        address recipientClub;
    }

    mapping(uint256 => Player) public players;
    mapping(address => Club) public clubs;
    mapping(uint256 => Contract) public signedContracts;
    mapping(uint256 => Contract) public draftContracts;
    mapping(uint256 => Offer) public offers;

    function registerPlayer(string memory _firstName, string memory _lastName, uint256 birthDate) public {}
    function registerClub(string memory _firstName, string memory _lastName, uint256 birthDate) public {}
    function registerSignedContract(
        address _playerId,
        address _clubId,
        uint256 _duration,
        uint256 _salary,
        uint256 _releaseClause,
        uint256 _signUpBonus,
        uint256 _startTime
    ) public {}

    /*
    Functions to be coded:

    // CONTRACT SIGNING TRIPLE VALIDATION
    // negotiations are held on the outside so the process can be simplified in one step 
    // that must be validated (or signed) by all parties.
    // Validation steps are only there to ensure authentication and can be done in no particular order

    1: send transfer offer from club A to club B for player X (called by club)
        - player X must have an active ongoing contract with club B
        - transfer amount should be >= player X's release clause in their contract
        - club must have enough available budget to cover transfer fee, player salary and player bonus
    2: validate transfer offer (called by club B)
        - there must be an offer from another club (A) to this club (B)
    3: reject transfer offer (called by club B)
        - idem. 2
    4: validate transfer offer (called by player)
        - there must be an offer from a club (A) to player's current contract's club (B)
    5: reject transfer offer (called by player)
        - idem. 5

    // after all parties sign/validate, the new contract is registered and the new one is terminated
    // (possibly by setting a termination date to it)
    // also club B receives transfer fee from club A, and player receives salary + bonus from club A


    // CONTRACT SIGNING DOUBLE VALIDATION (free agent)
    // same principle but for players with no club

    6: club A send contract offer to player X
        - player X must NOT have an active ongoing contract with any other club
        - club must have enough available budget to cover player salary and player bonus
    7:  validate contract offer from club A
        - there must be a contract offer

    // maybe this process and the triple validation one can be simplified in a single process (à voir...)


    // REGULATIONS
    8: updateClubBudget
    Il faudrait avoir un moyen de gérer le budget autorisé du club comparé à ce qu'il a depensé

    */
}