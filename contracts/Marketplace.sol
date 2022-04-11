// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./MyNFT.sol";
import "./IERC20.sol";

contract Marketplace {
    MyNFT public NFT;
    IERC20 public tradeToken;

    mapping(uint256 => uint) private _prices;
    mapping(uint => address) public owners;
    
    struct Auction {
        uint lastBid;
        address lastBidder;
        uint8 bids;
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
        require(price > 0, "Specify non-zero price");
        NFT.transferFrom(msg.sender, address(this), tokenId);
        _prices[tokenId] = price;
        return true;
    }

    function cancel(uint tokenId) public returns (bool success) {
        require(msg.sender ==  owners[tokenId], "Not an owner");
        _prices[tokenId] = 0;
        NFT.transferFrom(address(this), msg.sender, tokenId);
        return true;
    }

    function buyItem(uint tokenId) public returns (bool success) {
        require(_prices[tokenId] > 0, "Not on sale");
        tradeToken.transferFrom(msg.sender, owners[tokenId], _prices[tokenId]);
        NFT.transferFrom(address(this), msg.sender, tokenId);
        owners[tokenId] = msg.sender;
        _prices[tokenId] = 0;
        return true;
    }

    function listItemOnAuction(uint tokenId, uint minPrice) public returns (bool success) {
        require(msg.sender ==  owners[tokenId], "Not an owner");
        require(minPrice > 0, "Specify non-zero price");
        NFT.transferFrom(msg.sender, address(this), tokenId);
        _auctions[tokenId].lastBid = minPrice;
        return true;
    }

    function makeBid(uint tokenId, uint price) public returns (bool success) {
        require(_auctions[tokenId].lastBid > 0, "Item not on auction");
        require(price > _auctions[tokenId].lastBid, "Pay up!");
        if (_auctions[tokenId].bids == 0) {
            _auctions[tokenId].started = block.timestamp;
        } else {
            require(_auctions[tokenId].started + 259200 > block.timestamp, "Auction finished");
            require(_auctions[tokenId].lastBidder != msg.sender, "Can't bid twice");

            tradeToken.transfer(_auctions[tokenId].lastBidder, _auctions[tokenId].lastBid);
        }

        tradeToken.transferFrom(msg.sender, address(this), price);
        _auctions[tokenId].lastBid = price;
        _auctions[tokenId].lastBidder = msg.sender;
        if (_auctions[tokenId].bids != 3) {
            _auctions[tokenId].bids += 1; 
        }
        return true;
    }

    function finishAuction(uint tokenId) public returns (bool success) {
        require(_auctions[tokenId].lastBid > 0, "No such auction");
        require(_auctions[tokenId].started + 259200 < block.timestamp, "3 days have not passed");
        if (_auctions[tokenId].bids == 3) {
            tradeToken.transfer(owners[tokenId], _auctions[tokenId].lastBid);
            NFT.transferFrom(address(this), _auctions[tokenId].lastBidder, tokenId);
        } else {
            tradeToken.transfer(_auctions[tokenId].lastBidder, _auctions[tokenId].lastBid);
            NFT.transferFrom(address(this), owners[tokenId], tokenId);
        }
        _auctions[tokenId].lastBid = 0;
        return true;
    }
}
