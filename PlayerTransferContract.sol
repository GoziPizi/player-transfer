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
    mapping(address => Contract) public playerContract;
    mapping(address => uint256) public clubAuthorizedBudget;
    // First address: Player, second address: Club
    mapping(address => mapping(address => OfferForFreeAgent))
        public offersForFreeAgents;
    mapping(address => mapping(address => Offer)) public offers;

    function withdraw() public {
        uint256 amount = balanceOf[msg.sender];
        require(
            address(this).balance >= amount,
            "Smart contract funds insufficient."
        );

        balanceOf[msg.sender] = 0;
        if (!payable(msg.sender).send(amount)) {
            balanceOf[msg.sender] = amount;
        }
    }

    struct Contract {
        address clubAddress;
        address playerAddress;
        uint256 minTransferFee;
        uint256 salary;
        uint256 startDate;
        uint256 endDate;
    }

    struct OfferForFreeAgent {
        address clubAddress;
        address playerAddress;
        uint256 contractSalary;
        uint256 contractMinTransferFee;
        uint256 contractEndDate;
    }

    struct Offer {
        address oldClubAddress;
        address newClubAddress;
        address playerAddress;
        uint256 transferFee;
        uint256 contractMinTransferFee;
        uint256 contractSalary;
        uint256 contractEndDate;
        bool oldClubSigned;
    }

    /*********************
     * MODIFIERS
     *********************/

    modifier isOwner() {
        require(msg.sender == owner, "Address not authorized.");
        _;
    }

    modifier isFreeAgent(address _player) {
        Contract memory currentContract = playerContract[_player];
        require(
            currentContract.endDate < block.timestamp ||
                currentContract.playerAddress == address(0),
            "Player is not free agent."
        );
        _;
    }

    modifier offerExists(address _player, address _newClub) {
        require(
            offers[_player][_newClub].playerAddress == _player,
            "Offer does not exist."
        );
        _;
    }

    modifier offerForFreeAgentExists(address _player, address _newClub) {
        require(
            offersForFreeAgents[_player][_newClub].playerAddress == _player,
            "Offer for free agent does not exist."
        );
        _;
    }

    /*********************
     * OWNER METHODS
     *********************/

    function setClubAuthorizedBudget(
        address _club,
        uint256 _authorizedBudget
    ) public isOwner {
        clubAuthorizedBudget[_club] = _authorizedBudget;
    }

    /*********************
     * CLUB METHODS
     *********************/

    function makeOffer(
        address _player,
        uint256 _contractMinTransferFee,
        uint256 _contractSalary,
        uint256 _contractEndDate
    ) public payable {
        Contract memory currentContract = playerContract[_player];
        uint256 transferFee = msg.value;
        address newClub = msg.sender;

        require(_player != address(0), "Player address invalid.");
        require(
            currentContract.endDate > block.timestamp,
            "Player has no active contract."
        );
        require(
            transferFee <= clubAuthorizedBudget[newClub],
            "Authorized budget limit exceeded."
        );
        require(
            transferFee >= currentContract.minTransferFee,
            "Offered transfer fee is below minimum transfer fee."
        );

        offers[_player][newClub] = Offer(
            currentContract.clubAddress,
            newClub,
            _player,
            transferFee,
            _contractMinTransferFee,
            _contractSalary,
            _contractEndDate,
            false
        );
    }

    function makeOfferForFreeAgent(
        address _player,
        uint256 _contractSalary,
        uint256 _contractMinTransferFee,
        uint256 _contractEndDate
    ) public isFreeAgent(_player) {
        address newClub = msg.sender;

        require(_player != address(0), "Player address invalid.");

        offersForFreeAgents[_player][newClub] = OfferForFreeAgent(
            newClub,
            _player,
            _contractSalary,
            _contractMinTransferFee,
            _contractEndDate
        );
    }

    function withdrawOffer(
        address _player
    ) public offerExists(_player, msg.sender) {
        address newClub = msg.sender;
        uint256 transferFee = offers[_player][newClub].transferFee;
        clearOffer(_player, newClub);
        balanceOf[msg.sender] += transferFee;
    }

    function withdrawOfferForFreeAgent(
        address _player
    ) public offerForFreeAgentExists(_player, msg.sender) {
        address newClub = msg.sender;
        clearOfferForFreeAgent(_player, newClub);
    }

    function clubValidateOffer(
        address _player,
        address _newClub
    ) public offerExists(_player, _newClub) {
        Offer memory offer = offers[_player][_newClub];
        address oldClub = msg.sender;

        require(
            oldClub == offer.oldClubAddress,
            "Club not authorized to validate this offer."
        );

        offers[_player][_newClub].oldClubSigned = true;
    }

    function clubDeclineOffer(
        address _player,
        address _newClub
    ) public offerExists(_player, _newClub) {
        Offer memory offer = offers[_player][_newClub];
        uint256 transferFee = offer.transferFee;
        address oldClub = msg.sender;

        require(
            oldClub == offer.oldClubAddress,
            "Club not authorized to decline this offer."
        );

        balanceOf[_newClub] += transferFee;
        clearOffer(_player, _newClub);
    }

    /*********************
     * PLAYER METHODS
     *********************/

    function playerValidateOffer(
        address _newClub
    ) public offerExists(msg.sender, _newClub) {
        address player = msg.sender;
        Offer memory offer = offers[player][_newClub];

        require(offer.playerAddress == player, "Offer invalid.");
        require(offer.oldClubSigned, "Current club signature missing.");
        require(
            playerContract[msg.sender].clubAddress == offer.oldClubAddress,
            "Current club address mismatch."
        );

        clubAuthorizedBudget[_newClub] -= offer.transferFee;
        clubAuthorizedBudget[offer.oldClubAddress] += offer.transferFee;
        balanceOf[offer.oldClubAddress] += offer.transferFee;

        playerContract[player] = Contract(
            offer.newClubAddress,
            offer.playerAddress,
            offer.contractMinTransferFee,
            offer.contractSalary,
            block.timestamp,
            offer.contractEndDate
        );
        clearOffer(player, _newClub);
    }

    function playerValidateOfferForFreeAgent(
        address _newClub
    )
        public
        isFreeAgent(msg.sender)
        offerForFreeAgentExists(msg.sender, _newClub)
    {
        address player = msg.sender;
        OfferForFreeAgent memory offer = offersForFreeAgents[player][_newClub];

        require(offer.playerAddress == player, "Offer invalid.");

        playerContract[player] = Contract(
            offer.clubAddress,
            offer.playerAddress,
            offer.contractMinTransferFee,
            offer.contractSalary,
            block.timestamp,
            offer.contractEndDate
        );
        clearOfferForFreeAgent(player, _newClub);
    }

    function playerDeclineOffer(
        address _newClub
    ) public offerExists(msg.sender, _newClub) {
        address player = msg.sender;
        Offer memory offer = offers[player][_newClub];

        require(offer.playerAddress == player, "Offer invalid.");

        uint256 transferFee = offers[player][_newClub].transferFee;
        balanceOf[msg.sender] += transferFee;

        clearOffer(player, _newClub);
    }

    function playerDeclineOfferForFreeAgent(
        address _newClub
    )
        public
        isFreeAgent(msg.sender)
        offerForFreeAgentExists(msg.sender, _newClub)
    {
        address player = msg.sender;
        OfferForFreeAgent memory offer = offersForFreeAgents[player][_newClub];

        require(offer.playerAddress == player, "Offer invalid.");

        clearOffer(player, _newClub);
    }

    /*********************
     * PRIVATE METHODS
     *********************/

    function clearOffer(
        address _player,
        address _newClub
    ) private offerExists(_player, _newClub) {
        offers[_player][_newClub] = Offer(
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

    function clearOfferForFreeAgent(
        address _player,
        address _newClub
    ) private offerForFreeAgentExists(_player, _newClub) {
        offersForFreeAgents[_player][_newClub] = OfferForFreeAgent(
            address(0),
            address(0),
            0,
            0,
            0
        );
    }

    /*********************
     * METHODS FOR TESTING
     *********************/

    function getOwner() public view returns(address) {
        return owner;
    }

    function getStandard() public view returns(string memory) {
        return standard;
    }

    function getName() public view returns(string memory) {
        return name;
    }

    function getSymbol() public view returns(string memory) {
        return symbol;
    }

    function getClubAuthorizedBudget(address _club) public view returns(uint256) {
        return clubAuthorizedBudget[_club];
    }

    function getOffer(address _player, address _newClub) public view returns(Offer memory) {
        return offers[_player][_newClub];
    }

    function getOfferForFreeAgent(address _player, address _newClub) public view returns(OfferForFreeAgent memory) {
        return offersForFreeAgents[_player][_newClub];
    }

    function getBalanceOf(address _club) public view returns(uint256) {
        return balanceOf[_club];
    }

    function getPlayerContract(address _player) public view returns(Contract memory) {
        return playerContract[_player];
    }
}