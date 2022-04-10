//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./MyNFT.sol";

contract Marketplace {
    MyNFT public NFT;
    IERC20 public tradeToken;

    mapping(uint256 => uint) private _prices;
    mapping(uint => address) public owners;
    mapping(uint => bool) private _isFreeSale;

    mapping(uint256 => uint) private _auctionedMinPrices;
    
    enum Status { One, Two, Three }
    struct Auction {
        uint lastBid;
        address lastBidder;
        Status status;
        uint started;
    }
    mapping(uint => Auction) private _auctions;

    constructor(address token) {
        NFT = new MyNFT();
        tradeToken = IERC20(token);
    }

    function createItem(string memory tokenURI) public returns (uint) {
        uint tokenId = NFT.safeMint(msg.sender, tokenURI);
        owners[tokenId] = msg.sender;
        return tokenId;
    }

    function listItem(uint tokenId, uint price) public returns (bool success) {
        require(msg.sender ==  owners[tokenId], "Not an owner");
        NFT.transferFrom(msg.sender, address(this), tokenId);
        _prices[tokenId] = price;
        if (price == 0) {
            _isFreeSale[tokenId] = true;
        }
        return true;
    }

    function cancel(uint tokenId) public returns (bool success) {
        require(msg.sender ==  owners[tokenId], "Not an owner");
        _prices[tokenId] = 0;
        NFT.transferFrom(address(this), msg.sender, tokenId);
        return true;
    }

    function buyItem(uint tokenId) public returns (bool success) {
        if (_prices[tokenId] == 0) {
            require(_isFreeSale[tokenId], "Not on sale");
        }
        tradeToken.transferFrom(msg.sender, owners[tokenId], _prices[tokenId]);
        NFT.transferFrom(address(this), msg.sender, tokenId);
        owners[tokenId] = msg.sender;
        _prices[tokenId] = 0;
        _isFreeSale[tokenId] = false;
        return true;
    }

    function listItemOnAuction(uint tokenId, uint minPrice) public returns (bool success) {
        require(msg.sender ==  owners[tokenId], "Not an owner");
        require(minPrice > 0, "Specify non-zero price");
        NFT.transferFrom(msg.sender, address(this), tokenId);
        _auctionedMinPrices[tokenId] = minPrice;
        return true;
    }

    function makeBid(uint tokenId, uint price) public returns (bool success) {
        require(_auctionedMinPrices[tokenId] > 0, "Item not on auction");
        if (_auctions[tokenId].lastBid == 0) {
            //first bid
            require(price > _auctionedMinPrices[tokenId], "Pay up!");
            tradeToken.transferFrom(msg.sender, address(this), price);
            _auctions[tokenId].lastBid = price;
            _auctions[tokenId].lastBidder = msg.sender;
            _auctions[tokenId].status = Status.One;
            _auctions[tokenId].started = block.timestamp;
        } else {
            require(price > _auctions[tokenId].lastBid, "Pay up!");
            require(_auctions[tokenId].started + 259200 > block.timestamp, "Auction finished");
            require(_auctions[tokenId].lastBidder != msg.sender, "Can't bid twice");

            tradeToken.transferFrom(msg.sender, address(this), price);
            tradeToken.transfer(_auctions[tokenId].lastBidder, _auctions[tokenId].lastBid);

            _auctions[tokenId].lastBid = price;
            _auctions[tokenId].lastBidder = msg.sender;
            if (_auctions[tokenId].status != Status.Three) {
                _auctions[tokenId].status = Status(uint(_auctions[tokenId].status) + 1);
            }
        }
        return true;
    }

    function finishAuction(uint tokenId) public returns (bool success) {
        require(_auctionedMinPrices[tokenId] > 0, "No such auction");
        require(_auctions[tokenId].started + 259200 < block.timestamp, "3 days have not passed");
        if (_auctions[tokenId].status == Status.Three) {
            tradeToken.transfer(owners[tokenId], _auctions[tokenId].lastBid);
            NFT.transferFrom(address(this), _auctions[tokenId].lastBidder, tokenId);
        } else {
            tradeToken.transfer(_auctions[tokenId].lastBidder, _auctions[tokenId].lastBid);
            NFT.transferFrom(address(this), owners[tokenId], tokenId);
        }
        _auctionedMinPrices[tokenId] = 0;
        _auctions[tokenId].lastBid = 0;
        return true;
    }
}
/*
interface IMyNFT {
    function safeMint(address to, string memory uri) external returns (uint);

    function tokenURI(uint256 tokenId) external view returns (string memory);

    function transferFrom(address from, address to, uint256 tokenId) external;
}
*/
interface IERC20 {
    function transfer(
        address recipient,
        uint amount
    ) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool);
}
