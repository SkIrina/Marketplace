import { task } from "hardhat/config";

const contractAddress = "0x9d0b99694531Daff70a77B6A361911c7FCAB894E";

task("createItem", "Mints from the NFT contract")
.addParam("tokenURI", "The link to the metadata")
.setAction(async function ({ tokenURI }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.createItem(tokenURI, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

task("listItem", "Put item for sale")
.addParam("tokenId", "Token ID")
.addParam("price", "NFT price")
.setAction(async function ({ tokenId, price }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.listItem(tokenId, price, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

task("cancel", "Cancel item sale")
.addParam("tokenId", "Token ID")
.setAction(async function ({ tokenId }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.cancel(tokenId, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

task("buyItem", "Buy item on the market")
.addParam("tokenId", "Token ID")
.setAction(async function ({ tokenId }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.buyItem(tokenId, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});


task("listItemOnAuction", "Put item for auction")
.addParam("tokenId", "Token ID")
.addParam("price", "NFT price")
.setAction(async function ({ tokenId, price }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.listItemOnAuction(tokenId, price, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

task("makeBid", "Make bid for item at auction")
.addParam("tokenId", "Token ID")
.addParam("bid", "Bid for NFT")
.setAction(async function ({ tokenId, bid }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.listItemOnAuction(tokenId, bid, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

task("finishAuction", "Finish auction")
.addParam("tokenId", "Token ID")
.setAction(async function ({ tokenId }, { ethers }) {
    const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
    const transactionResponse = await Marketplace.finishAuction(tokenId, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});