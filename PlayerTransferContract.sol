pragma solidity ^0.8.25;

contract PlayerTransferContract {
    address public owner;

    string public standard;
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOfClub;
    mapping(uint => address) public playerIndexToClubAddress;
    mapping(uint => string) public playerIndexToName;

    struct Offer {
        bool isForSale;
        uint playerIndex;
        address seller;
        uint minValue;
        address? onlySellTo;
    }

    struct Bid {
        bool hasBid;
        uint playerIndex;
        address bidder;
        uint value;
    }

    mapping(uint => Offer) public Offer;

    mapping(uint => Bid) public Bid;

    event PlayerRegistered(
        address clubAdress,
        uint playerIndex,
        string playerName
    );
    event PlayerTransfer(
        address indexed from,
        address indexed to,
        uint playerIndex
    );
    event PlayerBidEntered(
        address clubAdress,
        uint playerIndex,
        uint bidAmount
    );
    event PlayerBidWithdrawn(address clubAdress, uint playerIndex);
    event PlayerBidAccepted(address clubAdress, uint playerIndex);
    event PlayerBidRejected(address clubAdress, uint playerIndex);

    function PlayerTransferContract() {
        owner = msg.sender;
        standard = "Player Transfer Contract";
        name = "PLAYERTRANSFERATOR";
        symbol = "PTC";
        decimals = 0;
    }

    function registerPlayer(
        address clubAdress,
        uint playerIndex,
        string playerName
    ) {
        //ensures only the owner can register a player
        if (msg.sender != owner) {
            throw;
        }
        playerIndexToClubAddress[playerIndex] = clubAdress;
        playerIndexToName[playerIndex] = playerName;
        PlayerRegistered(clubAdress, playerIndex, playerName);
    }

    function transferPlayer(address to, uint playerIndex) {
        if (playerIndexToClubAddress[playerIndex] != msg.sender) {
            throw;
        }
        playerIndexToClubAddress[playerIndex] = to;
        PlayerTransfer(msg.sender, to, playerIndex);
    }

    function offerPlayerToSell(uint playerIndex, uint minSalePriceInWei) {
        Offer[playerIndex] = Offer(true, playerIndex, msg.sender, minSalePriceInWei, 0x0);
        PlayerBidEntered(msg.sender, playerIndex, minSalePriceInWei);
    }

    function offerPlayerToSellToAddress(
        uint playerIndex,
        uint minSalePriceInWei,
        address toAddress
    ) {
        Offer[playerIndex] = Offer(true, playerIndex, msg.sender, minSalePriceInWei, toAddress);
        PlayerBidEntered(msg.sender, playerIndex, minSalePriceInWei);
    }

    function buyPlayer(uint playerIndex) payable {
        Offer offer = Offer[playerIndex];
        if (offer.isForSale) {
            if (offer.onlySellTo != 0x0 && offer.onlySellTo != msg.sender) {
                throw;
            }
            if (msg.value < offer.minValue) {
                throw;
            }
            address seller = offer.seller;

            playerIndexToClubAddress[playerIndex] = msg.sender;
            PlayerTransfer(seller, msg.sender, playerIndex);

            offer.isForSale = false;
            if (!seller.send(msg.value)) {
                throw;
            }
        }
    }

    function withdraw() {
        uint amount = balanceOfClub[msg.sender];
        balanceOfClub[msg.sender] = 0;
        if (!msg.sender.send(amount)) {
            balanceOfClub[msg.sender] = amount;
        }
    }

    function enterBidForPlayer(uint playerIndex) payable {
        Offer offer = Offer[playerIndex];
        if (!offer.isForSale) {
            throw;
        }
        if (msg.value >= offer.minValue) {
            throw;
        }
        if (Bid[playerIndex].hasBid) {
            throw;
        }
        Bid[playerIndex] = Bid(true, playerIndex, msg.sender, msg.value);
        PlayerBidEntered(msg.sender, playerIndex, msg.value);
    }

    function acceptBidForPlayer(uint playerIndex, uint minPrice) {
        Offer offer = Offer[playerIndex];
        if (offer.seller != msg.sender) {
            throw;
        }
        Bid bid = Bid[playerIndex];
        if (!bid.hasBid) {
            throw;
        }
        if (bid.value < minPrice) {
            throw;
        }
        playerIndexToClubAddress[playerIndex] = bid.bidder;
        PlayerTransfer(msg.sender, bid.bidder, playerIndex);
        balanceOfClub[msg.sender] += bid.value;
        offer.isForSale = false;
        Bid[playerIndex] = Bid(false, playerIndex, 0x0, 0);
        PlayerBidAccepted(msg.sender, playerIndex);
    }

    function withdrawBidForPlayer(uint playerIndex) {
        Bid bid = Bid[playerIndex];
        if (bid.bidder != msg.sender) {
            throw;
        }
        uint amount = bid.value;
        Bid[playerIndex] = Bid(false, playerIndex, 0x0, 0);
        if (!msg.sender.send(amount)) {
            Bid[playerIndex] = Bid(true, playerIndex, msg.sender, amount);
        }
        PlayerBidWithdrawn(msg.sender, playerIndex);
    }
}
