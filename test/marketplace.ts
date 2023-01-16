import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Testing Marketplace",  function () {

    async function deploy() {
        const name = "TestToken"
        const symbol = "TT"
        const baseURI = "https://baseUri/"
        const [owner, seller, operator, buyer_1, buyer_2, hacker] = await ethers.getSigners()
    
        const ERC721 = await ethers.getContractFactory("ERC721")
        const erc721 = await ERC721.deploy(name, symbol, baseURI)

        const Marketplace = await ethers.getContractFactory("Marketplace")
        const marketplace = await Marketplace.deploy()

        const NotIERC165 = await ethers.getContractFactory("NotIERC165")
        const notIERC165 = await NotIERC165.deploy()

        const NotIERC721 = await ethers.getContractFactory("NotIERC721")
        const notIERC721 = await NotIERC721.deploy()

        const NotIERC721Metadata = await ethers.getContractFactory("NotIERC721Metadata")
        const notIERC721Metadata = await NotIERC721Metadata.deploy()

        return { marketplace, erc721, notIERC165, notIERC721, notIERC721Metadata, owner, seller, operator, buyer_1, buyer_2, hacker }
    }

    describe("listItem", () => {
        describe("Requires check that", () => {
            it("Can't listing an account that is not a contract", async () => {
                const { marketplace, seller } = await loadFixture(deploy)

                const tokenId = 1
                const price = 1
                await expect(marketplace.listItem(seller.address, tokenId, price))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing contract that does not support the IERC165 interface", async () => {
                const { marketplace, notIERC165 } = await loadFixture(deploy)

                const tokenId = 1
                const price = 1
                await expect(marketplace.listItem(notIERC165.address, tokenId, price))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing contract that does not support the IERC721 interface", async () => {
                const { marketplace, notIERC721 } = await loadFixture(deploy)

                const tokenId = 1
                const price = 1
                await expect(marketplace.listItem(notIERC721.address, tokenId, price))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing contract that does not support the IERC721Metadata interface", async () => {
                const { marketplace, notIERC721Metadata } = await loadFixture(deploy)

                const tokenId = 1
                const price = 1
                await expect(marketplace.listItem(notIERC721Metadata.address, tokenId, price))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing ERC721 if caller are't token owner or operator", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                const tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                expect(await erc721.ownerOf(tokenId)).to.not.equal(hacker.address)
                expect(await erc721.getApproved(tokenId)).to.not.equal(hacker.address)
                expect(await erc721.isApprovedForAll(seller.address, hacker.address)).to.not.equal(true)
                await expect(marketplace.connect(hacker).listItem(erc721.address, tokenId, price))
                .to.be.revertedWith("Marketplace: caller is not are owner or operator of token")
            })

            it("Can't listing ERC721 if token owner not approve token for marketplace", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                const tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                expect(await erc721.getApproved(tokenId)).to.not.equal(marketplace.address)
                expect(await erc721.isApprovedForAll(seller.address, marketplace.address)).to.not.equal(true)
                await expect(marketplace.connect(seller).listItem(erc721.address, tokenId, price))
                .to.be.revertedWith("Marketplace: no allowance to transfer a token")
            })
        })

        describe("listItem", () => {
            it("Check that token transfer to marketplace correctly, when marketplace - operator of token", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                expect(await erc721.ownerOf(tokenId)).to.equal(marketplace.address)
            })

            it("Check that token transfer to marketplace correctly, when marketplace - operator for all token", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).setApprovalForAll(marketplace.address, true)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                expect(await erc721.ownerOf(tokenId)).to.equal(marketplace.address)
            })

            it("Check that listId change correctly", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                const listId = await marketplace.listId()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                expect(await marketplace.listId()).to.equal(listId.add(1))
            })

            it("Check that listItem create correctly", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()
                const list = await marketplace.list(listId)

                expect(list).to.deep.equal([tokenId, price, erc721.address, seller.address])
            })
        })

        describe("Event", () => {
            it("Check emit an event on ListItem", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(seller).listItem(erc721.address, tokenId, price))
                    .to.emit(marketplace, "ListItem")
                .withArgs(listId.add(1), erc721.address, tokenId, price)
            })
        })
    })

    describe("buyItem", () => {
        describe("Requires check that", () => {
            it("Can't buy token if it not sell", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const listId = await marketplace.listId()
                const price = 1

                await expect(marketplace.connect(hacker).buyItem(listId.add(1), {value: price}))
                .to.be.revertedWith("Marketplace: no such token for sale")
            })

            it("Can't buy token if buyer send not enough ETH", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(hacker).buyItem(listId, {value: price - 1}))
                .to.be.revertedWith("Marketplace: not enough ETH")
            })
        })

        describe("BuyItem", () => {
            it("Check that ETH send to seller correctly", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(buyer_1).buyItem(listId, {value: price}))
                .to.be.changeEtherBalance(
                    seller.address, price
                )
            })

            it("Check that if buyer send more ETH he take extra ETH back", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                const value = price * 2

                await expect(marketplace.connect(buyer_1).buyItem(listId, {value: value}))
                .to.be.changeEtherBalances(
                    [seller.address, buyer_1.address, marketplace.address], 
                    [price, -price, 0]
                )
            })

            it("Check that the token is sent to the buyer correctly", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                expect(await erc721.ownerOf(tokenId)).to.equal(marketplace.address)

                await expect(marketplace.connect(buyer_1).buyItem(listId, {value: price}))
                .to.be.changeTokenBalances(
                    erc721,
                    [buyer_1.address, marketplace.address],
                    [1, -1]
                )
                expect(await erc721.ownerOf(tokenId)).to.not.equal(marketplace.address)
                expect(await erc721.ownerOf(tokenId)).to.equal(buyer_1.address)
            })

            it("Check that item delete from list correctly", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                tx = await marketplace.connect(buyer_1).buyItem(listId, {value: price})
                await tx.wait()

                const list = await marketplace.list(listId)
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(list).to.deep.equal([0, 0, zeroAddress, zeroAddress])
            })
        })

        describe("Event", () => {
            it("Check emit an event on BuyItem", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(buyer_1).buyItem(listId, {value: price}))
                .to.emit(
                    marketplace,
                    "BuyItem"
                ).withArgs(listId)
            })
        })
    })

    describe("Cancel", () => {
        describe("Requires check that", () => {
            it("Can't cancel token if it not sell", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(hacker).cancel(listId.add(1)))
                .to.be.revertedWith("Marketplace: no such token for sale")
            })

            it("Can't cancel item if caller are't token owner or operator", async function () {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                expect(await erc721.ownerOf(tokenId)).to.not.equal(hacker.address)
                expect(await erc721.isApprovedForAll(seller.address, hacker.address)).to.not.equal(true)
                await expect(marketplace.connect(hacker).cancel(listId))
                .to.be.revertedWith("Marketplace: caller is not are owner or operator of token")
            })
        })

        describe("Cancel", () => {
            it("Check that token return to seller correctly", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(seller).cancel(listId))
                .to.be.changeTokenBalances(
                    erc721,
                    [seller.address, marketplace.address],
                    [1, -1]
                )
                expect(await erc721.ownerOf(tokenId)).to.be.equal(seller.address)
            })

            it("Check that item delete correctly", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                tx = await marketplace.connect(seller).cancel(listId)
                await tx.wait()

                const list = await marketplace.list(listId)
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(list).to.deep.equal([0, 0, zeroAddress, zeroAddress])
            })
        })

        describe("Event", () => {
            it("Check emit an event on Cancel", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const price = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItem(erc721.address, tokenId, price)
                await tx.wait()

                const listId = await marketplace.listId()

                await expect(marketplace.connect(seller).cancel(listId))
                .to.emit(
                    marketplace,
                    "Cancel"
                ).withArgs(listId)
            })
        })
    })

    describe("listItemOnAuction", () => {
        describe("Requires check that", () => {
            it("Can't listing an account that is not a contract", async function () {
                const { marketplace, seller } = await loadFixture(deploy)

                const tokenId = 1
                const minPrice = 1
                await expect(marketplace.listItemOnAuction(seller.address, tokenId, minPrice))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing contract that does not support the IERC165 interface", async () => {
                const { marketplace, notIERC165 } = await loadFixture(deploy)

                const tokenId = 1
                const price = 1
                await expect(marketplace.listItem(notIERC165.address, tokenId, price))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing contract that does not support the ERC721 interface", async () => {
                const { marketplace, notIERC721 } = await loadFixture(deploy)

                const tokenId = 1
                const minPrice = 1
                await expect(marketplace.listItemOnAuction(notIERC721.address, tokenId, minPrice))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing contract that does not support the IERC721Metadata interface", async () => {
                const { marketplace, notIERC721Metadata } = await loadFixture(deploy)

                const tokenId = 1
                const minPrice = 1
                await expect(marketplace.listItemOnAuction(notIERC721Metadata.address, tokenId, minPrice))
                .to.be.revertedWith("Marketplace: tokenAddress does not support the ERC721 interfaces")
            })

            it("Can't listing ERC721 if caller are't token owner or operator", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                const tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                expect(await erc721.ownerOf(tokenId)).to.not.equal(hacker.address)
                expect(await erc721.getApproved(tokenId)).to.not.equal(hacker.address)
                expect(await erc721.isApprovedForAll(seller.address, hacker.address)).to.not.equal(true)
                await expect(marketplace.connect(hacker).listItemOnAuction(erc721.address, tokenId, minPrice))
                .to.be.revertedWith("Marketplace: caller is not are owner or operator of token")
            })

            it("Can't listing ERC721 if token owner not approve token for marketplace", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                const tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                expect(await erc721.getApproved(tokenId)).to.not.equal(marketplace.address)
                expect(await erc721.isApprovedForAll(seller.address, marketplace.address)).to.not.equal(true)
                await expect(marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice))
                .to.be.revertedWith("Marketplace: no allowance to transfer a token")
            })
        })

        describe("listItemOnAuction", () => {
            it("Check that token transfer to marketplace correctly, when marketplace - operator of token", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                expect(await erc721.ownerOf(tokenId)).to.equal(marketplace.address)
            })

            it("Check that token transfer to marketplace correctly, when marketplace - operator for all token", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).setApprovalForAll(marketplace.address, true)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                expect(await erc721.ownerOf(tokenId)).to.equal(marketplace.address)
            })

            it("Check that listId change correctly", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                expect(await marketplace.listAuctionId()).to.equal(listAuctionId.add(1))
            })

            it("Check that listItem create correctly", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()
                const listAuction = await marketplace.listAuction(listAuctionId)
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(listAuction).to.deep.equal([tokenId, minPrice, listAuction.time, 0, erc721.address, seller.address, zeroAddress])
            })
        })

        describe("Event", () => {
            it("Check emit an event on ListItemOnAuction", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                await expect(marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice))
                    .to.emit(marketplace, "ListItemOnAuction")
                .withArgs(listAuctionId.add(1), erc721.address, tokenId, minPrice)
            })
        })
    })

    describe("MakeBid", () => {
        describe("Requires check that", () => {
            it("Can't possible to place a bet, for a non-existent item", async () => {
                const { marketplace, hacker } = await loadFixture(deploy)

                const listAuctionId = await marketplace.listAuctionId()
                const bid = 1

                await expect(marketplace.connect(hacker).makeBid(listAuctionId.add(1), {value: bid}))
                .to.be.revertedWith("Marketplace: no such token for auction")
            })

            it("Can't possible to place a bet if auction over", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                // moving time
                const auctionTime = 60 * 60 * 24 * 3
                await time.increaseTo((await time.latest()) + auctionTime)

                await expect(marketplace.connect(hacker).makeBid(listAuctionId, {value: minPrice + 1}))
                .to.be.revertedWith("Marketplace: auction is over")
            })

            it("Can't possible to place a bet if it not more than last bet", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                await expect(marketplace.connect(hacker).makeBid(listAuctionId, {value: minPrice}))
                .to.be.revertedWith("Marketplace: the current price is higher than the bid")
            })
        })

        describe("MakeBid", () => {
            it("Check that the first bid correctly changed balance of marketplace", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1

                await expect(marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid}))
                .to.be.changeEtherBalance(marketplace.address, bid)
            })

            it("Check that the first bid correctly changed auctionItem", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1

                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid})
                await tx.wait()

                const auctionItem = await marketplace.listAuction(listAuctionId)

                expect(auctionItem.lastCustomer).to.equal(buyer_1.address)
                expect(auctionItem.currentPrice).to.equal(bid)
                expect(auctionItem.bidCount).to.equal(1)
            })

            it("Check that the second and subsequent bets correctly changed balance of marketplace", async () => {
                const { marketplace, erc721, seller, buyer_1, buyer_2 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid_1 = minPrice + 1

                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid_1})
                await tx.wait()

                const bid_2 = bid_1 + 1
                await expect(marketplace.connect(buyer_2).makeBid(listAuctionId, {value: bid_2}))
                .to.be.changeEtherBalance(marketplace.address, bid_2 - bid_1)
            })

            it("Check that the the second and subsequent bets correctly changed auctionItem", async () => {
                const { marketplace, erc721, seller, buyer_1, buyer_2 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid_1 = minPrice + 1

                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid_1})
                await tx.wait()

                const bidCount = (await marketplace.listAuction(listAuctionId)).bidCount

                const bid_2 = bid_1 + 1

                tx = await marketplace.connect(buyer_2).makeBid(listAuctionId, {value: bid_2})
                await tx.wait()

                const auctionItem = await marketplace.listAuction(listAuctionId)

                expect(auctionItem.lastCustomer).to.equal(buyer_2.address)
                expect(auctionItem.currentPrice).to.equal(bid_2)
                expect(auctionItem.bidCount).to.equal(bidCount + 1)
            })
        })

        describe("Event", () => {
            it("Check emit an event on MakeBid", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1

                await expect(marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid}))
                .to.emit(marketplace, "MakeBid")
                .withArgs(listAuctionId, bid)
            })
        })
    })

    describe("FinishAuction", () => {
        describe("Requires check that", async () => {
            it("Can't possible finish auction, for a non-existent item", async () => {
                const { marketplace, hacker } = await loadFixture(deploy)

                const listAuctionId = await marketplace.listAuctionId()

                await expect(marketplace.connect(hacker).finishAuction(listAuctionId.add(1)))
                .to.be.revertedWith("Marketplace: no such token for auction")
            })

            it("Can't possible end the auction before time expires", async () => {
                const { marketplace, erc721, seller, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                await expect(marketplace.connect(hacker).finishAuction(listAuctionId))
                .to.be.revertedWith("Marketplace: auction is not yet over")
            })
        })

        describe("FinishAuction", () => {
            it("Check that if there were no bids, the token is returned to its owner correctly", async () => {
                const { marketplace, erc721, seller } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()
                const tokenOwner = (await marketplace.listAuction(listAuctionId)).tokenOwner

                // moving time
                const auctionTime = 60 * 60 * 24 * 3
                await time.increaseTo((await time.latest()) + auctionTime)

                await expect(marketplace.finishAuction(listAuctionId))
                .to.be.changeTokenBalances(
                    erc721,
                    [tokenOwner, marketplace.address],
                    [1, -1]
                )
                expect(await erc721.ownerOf(tokenId)).to.equal(seller.address)
            })

            it("Check that if there were bids, the token is sent to the buyer correctly", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1
                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid})

                // moving time
                const auctionTime = 60 * 60 * 24 * 3
                await time.increaseTo((await time.latest()) + auctionTime)

                await expect(marketplace.finishAuction(listAuctionId))
                .to.be.changeTokenBalances(
                    erc721,
                    [buyer_1.address, marketplace.address],
                    [1, -1]
                )
                expect(await erc721.ownerOf(tokenId)).to.equal(buyer_1.address)
            })

            it("Check that if there were bids, ETH is sent to the seller correctly", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1
                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid})

                // moving time
                const auctionTime = 60 * 60 * 24 * 3
                await time.increaseTo((await time.latest()) + auctionTime)

                const currentPrice = (await marketplace.listAuction(listAuctionId)).currentPrice

                await expect(marketplace.finishAuction(listAuctionId))
                .to.be.changeEtherBalance(seller.address, currentPrice)
            })

            it("Check that at the end of the auction auctionItem changed correctly", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1
                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid})

                // moving time
                const auctionTime = 60 * 60 * 24 * 3
                await time.increaseTo((await time.latest()) + auctionTime)

                tx = await marketplace.finishAuction(listAuctionId)
                await tx.wait()

                const listAuction = await marketplace.listAuction(listAuctionId)
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(listAuction).to.deep.equal([0, 0, 0, 0, zeroAddress, zeroAddress, zeroAddress])
            })
        })

        describe("Event", () => {
            it("Check emit an event on FinishAuction", async () => {
                const { marketplace, erc721, seller, buyer_1 } = await loadFixture(deploy)

                let tx = await erc721.mint(seller.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const minPrice = 1

                tx = await erc721.connect(seller).approve(marketplace.address, tokenId)
                await tx.wait()

                tx = await marketplace.connect(seller).listItemOnAuction(erc721.address, tokenId, minPrice)
                await tx.wait()

                const listAuctionId = await marketplace.listAuctionId()

                const bid = minPrice + 1
                tx = await marketplace.connect(buyer_1).makeBid(listAuctionId, {value: bid})

                // moving time
                const auctionTime = 60 * 60 * 24 * 3
                await time.increaseTo((await time.latest()) + auctionTime)

                const currentPrice = (await marketplace.listAuction(listAuctionId)).currentPrice

                await expect(marketplace.finishAuction(listAuctionId))
                .to.emit(marketplace, "FinishAuction")
                .withArgs(listAuctionId, currentPrice)
            })
        })
    })
})