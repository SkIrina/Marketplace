import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Token__factory, Token, MyNFT__factory, MyNFT, Marketplace, Marketplace__factory } from "../typechain";
import { BigNumber } from "ethers";

describe("My awesome marketplace contract", function () {
  let ERC20Token: Token__factory;
  let erc20Token: Token;
  // let MyNFT: MyNFT__factory;
  let myNFT: MyNFT;
  let Marketplace: Marketplace__factory;
  let marketplace: Marketplace;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const tokenUri =
  "https://bafybeiacwm7gbjuwvr3t45sh7kp4mi2cr3qvcmift5qeiufjhxgylcn7ye.ipfs.dweb.link/metadata/1";

  beforeEach(async function () {
    // MyNFT = await ethers.getContractFactory("MyNFT");
    // myNFT = await MyNFT.deploy();

    ERC20Token = await ethers.getContractFactory("Token");
    erc20Token = await ERC20Token.deploy("Token", "TKN");
  
    Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(erc20Token.address);
    
    let myNFTaddr = await marketplace.NFT();
    myNFT = await ethers.getContractAt("MyNFT", myNFTaddr);
  
    await marketplace.deployed();

    [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    // addr1 gets the item
    await marketplace.connect(addr1).createItem(tokenUri);
  });

  describe("createItem", function () {
    it("Should let user create an item on marketplace and set uri", async function () {
        // addr1 gets the item
    await marketplace.connect(addr2).createItem(tokenUri);

    expect(await myNFT.ownerOf(1)).to.equal(addr2.address);
    expect(await myNFT.tokenURI(1)).to.equal(tokenUri);
    });
  });

  describe("listItem", function () {
    it("Should let user put his item into market, transfer item to market", async function () {

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, 0);

      await expect(marketplace.connect(addr1).listItem(0, price))
        .to.emit(myNFT, "Transfer")
        .withArgs(addr1.address, marketplace.address, 0);
    });
  });

  describe("cancel", function () {
    it("Should let user return his item", async function () {

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, 0);
      await marketplace.connect(addr1).listItem(0, price);

      await expect(marketplace.connect(addr1).cancel(0))
        .to.emit(myNFT, "Transfer")
        .withArgs(marketplace.address, addr1.address, 0);
    });

    it("Should not let non-owner cancel item sale", async function () {

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, 0);
      await marketplace.connect(addr1).listItem(0, price);

      await expect(marketplace.connect(addr2).cancel(0)).to.be.revertedWith(
        "Not an owner"
      );
    });
  });

  describe("buyItem", function () {
    it("Should let user buy listed item, transfer it to buyer", async function () {

      const tokenId = 0;

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItem(tokenId, price);

      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, price);

      await expect(marketplace.connect(addr2).buyItem(0))
        .to.emit(myNFT, "Transfer")
        .withArgs(marketplace.address, addr2.address, 0)
        .and.to.emit(erc20Token, "Transfer")
        .withArgs(addr2.address, addr1.address, price);

      expect(await marketplace.owners(tokenId)).to.equal(addr2.address);
    });

    it("Should let user buy listed item, transfer it to buyer for 0 price", async function () {

      const tokenId = 0;

      const price = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItem(tokenId, price);

      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, price);

      await expect(marketplace.connect(addr2).buyItem(0))
        .to.emit(myNFT, "Transfer")
        .withArgs(marketplace.address, addr2.address, 0)
        .and.to.emit(erc20Token, "Transfer")
        .withArgs(addr2.address, addr1.address, price);
    });

    it("Should not let buy unlisted item", async function () {

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, 0);
      await marketplace.connect(addr1).listItem(0, price);
      await marketplace.connect(addr1).cancel(0);

      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, price);

      await expect(marketplace.connect(addr2).buyItem(0)).to.be.revertedWith(
        "Not on sale"
      );
    });
  });

  describe("listItemOnAuction", function () {
    it("Should let user put his item on auction, transfer item to market", async function () {

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, 0);

      await expect(marketplace.connect(addr1).listItemOnAuction(0, price))
        .to.emit(myNFT, "Transfer")
        .withArgs(addr1.address, marketplace.address, 0);
    });

    it("Should not let non-owner put item on auction", async function () {

      const price = 1;
      await myNFT.connect(addr1).approve(marketplace.address, 0);

      await expect(marketplace.connect(addr2).listItemOnAuction(0, price))
        .to.be.revertedWith("Not an owner");
    });

    it("Should not let owner set zero price on auction", async function () {

      const price = 0;
      await myNFT.connect(addr1).approve(marketplace.address, 0);

      await expect(marketplace.connect(addr1).listItemOnAuction(0, price))
        .to.be.revertedWith("Specify non-zero price");
    });
  });

  describe("makeBid", function () {
    it("Should not let bid on unlisted item", async function () {
    // addr2 gets the item
    await marketplace.connect(addr2).createItem(tokenUri);
    const tokenId = 1;

    await expect(marketplace.connect(addr1).makeBid(tokenId, 2))
      .to.be.revertedWith("Item not on auction");
    });
    
    it("Should not let first bid be less than minPrice", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid = 1;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid);

      await expect(marketplace.connect(addr2).makeBid(tokenId, bid))
        .to.be.revertedWith("Pay up!");
    });

    it("Should not let bid less than previous", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 4;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      
      await marketplace.connect(addr2).makeBid(tokenId, bid2);

      const bid3 = 3;
      await erc20Token.transfer(addr3.address, 10);
      await erc20Token.connect(addr3).approve(marketplace.address, bid3);

      await expect(marketplace.connect(addr3).makeBid(tokenId, bid3))
        .to.be.revertedWith("Pay up!");
    });
    it("Should not let bid after 3 days", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 4;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      
      await marketplace.connect(addr2).makeBid(tokenId, bid2);

      const bid3 = 5;
      await erc20Token.transfer(addr3.address, 10);
      await erc20Token.connect(addr3).approve(marketplace.address, bid3);

      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [300000]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(marketplace.connect(addr3).makeBid(tokenId, bid3))
        .to.be.revertedWith("Auction finished");
    });
    it("Should not let bid twice", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 4;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      
      await marketplace.connect(addr2).makeBid(tokenId, bid2);

      const bid3 = 5;
      await expect(marketplace.connect(addr2).makeBid(tokenId, bid3))
        .to.be.revertedWith("Can't bid twice");
    });
    it("Should transfer money when bid made", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 4;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      
      await expect(marketplace.connect(addr2).makeBid(tokenId, bid2))
        .to.emit(erc20Token, "Transfer")
        .withArgs(addr2.address, marketplace.address, bid2);
    });
    it("Should return money to previous bidder when a new bid made", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 4;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      
      await marketplace.connect(addr2).makeBid(tokenId, bid2);

      const bid3 = 5;
      await erc20Token.transfer(addr3.address, 10);
      await erc20Token.connect(addr3).approve(marketplace.address, bid3);
      
      await expect(marketplace.connect(addr3).makeBid(tokenId, bid3))
        .to.emit(erc20Token, "Transfer")
        .withArgs(marketplace.address, addr2.address, bid2);
    });
  });

  describe("finishAuction", function () {
    it("Should revert for unlisted item", async function () {
    // addr2 gets the item
    await marketplace.connect(addr2).createItem(tokenUri);
    const tokenId = 1;

    await expect(marketplace.connect(addr1).finishAuction(tokenId))
      .to.be.revertedWith("No such auction");
    });
    
    it("Should not let finish until 3 days pass", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 3;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      await marketplace.connect(addr2).makeBid(tokenId, bid2);

      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [100000]);
      await ethers.provider.send("evm_mine", []);

      await expect(marketplace.connect(addr1).finishAuction(tokenId))
        .to.be.revertedWith("3 days have not passed");
    });

    it("Should transfer nft to last bidder, money to seller if 3 bids made", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 3;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      await marketplace.connect(addr2).makeBid(tokenId, bid2);
      
      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [100000]);
      await ethers.provider.send("evm_mine", []);

      const bid3 = 5;
      await erc20Token.transfer(addr3.address, 10);
      await erc20Token.connect(addr3).approve(marketplace.address, bid3);
      await marketplace.connect(addr3).makeBid(tokenId, bid3);

      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [100000]);
      await ethers.provider.send("evm_mine", []);

      const bid4 = 6;
      await erc20Token.transfer(addr4.address, 10);
      await erc20Token.connect(addr4).approve(marketplace.address, bid4);
      await marketplace.connect(addr4).makeBid(tokenId, bid4);

      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [100000]);
      await ethers.provider.send("evm_mine", []);

      await expect(marketplace.connect(addr1).finishAuction(tokenId))
        .to.emit(myNFT, "Transfer")
        .withArgs(marketplace.address, addr4.address, tokenId)
        .and        
        .to.emit(erc20Token, "Transfer")
        .withArgs(marketplace.address, addr1.address, bid4)
    });

    it("Should transfer return nft to owner, money to last bidder if 2 bids made", async function () {
      const minPrice = 2;
      const tokenId = 0;
      await myNFT.connect(addr1).approve(marketplace.address, tokenId);
      await marketplace.connect(addr1).listItemOnAuction(tokenId, minPrice);

      const bid2 = 3;
      await erc20Token.transfer(addr2.address, 10);
      await erc20Token.connect(addr2).approve(marketplace.address, bid2);
      await marketplace.connect(addr2).makeBid(tokenId, bid2);
      
      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [100000]);
      await ethers.provider.send("evm_mine", []);

      const bid3 = 5;
      await erc20Token.transfer(addr3.address, 10);
      await erc20Token.connect(addr3).approve(marketplace.address, bid3);
      await marketplace.connect(addr3).makeBid(tokenId, bid3);

      // emulate time passed, 72h = 259200sec
      await ethers.provider.send("evm_increaseTime", [200000]);
      await ethers.provider.send("evm_mine", []);


      await expect(marketplace.connect(addr1).finishAuction(tokenId))
        .to.emit(erc20Token, "Transfer")
        .withArgs(marketplace.address, addr3.address, bid3)
        .and
        .to.emit(myNFT, "Transfer")
        .withArgs(marketplace.address, addr1.address, tokenId)
    });
  });
});
