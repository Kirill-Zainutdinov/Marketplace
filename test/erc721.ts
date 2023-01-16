import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Testing ERC721",  () => {

    async function deploy() {
        const name = "TestToken"
        const symbol = "TT"
        const baseURI = "https://baseUri/"
        const [owner, account, operator, hacker] = await ethers.getSigners()
    
        const ERC721 = await ethers.getContractFactory("ERC721")
        const erc721 = await ERC721.deploy(name, symbol, baseURI)

        const ERC721Received = await ethers.getContractFactory("ERC721Received")
        const erc721Received = await ERC721Received.deploy()

        const NotERC721Received = await ethers.getContractFactory("NotERC721Received")
        const notErc721Received = await NotERC721Received.deploy()
    
        return { erc721, erc721Received, notErc721Received, name, symbol, baseURI, owner, account, operator, hacker }
    }

    describe("Deployment", () => {

        it("Check that the token _name is set correctly", async () => {
            const { erc721, name } = await loadFixture(deploy)

            expect(await erc721.name()).to.equal(name)
        })

        it("Check that the token _symbol is set correctly", async () => {
            const { erc721, symbol } = await loadFixture(deploy)

            expect(await erc721.symbol()).to.equal(symbol)
        })

        it("Check that the token _tokenId is set correctly", async () => {
            const { erc721 } = await loadFixture(deploy)

            expect(await erc721.getTokenId()).to.equal(0)
        })

        it("Check that the token _baseURI is set correctly", async () => {
            const { erc721, baseURI } = await loadFixture(deploy)

            expect(await erc721.getBaseUri()).to.equal(baseURI);
        })
    })

    describe("Mint", () => {
        describe("Require check that", () => {
            it("Only the contract owner can do token emission", async () => {
                const { erc721, hacker, } = await loadFixture(deploy)

                await expect(
                    erc721.connect(hacker).mint(hacker.address)
                ).to.be.revertedWith("ERC721: you are not owner")
            })
        })

        describe("Mint", () => {
            it("Check that token emission correctly changes the balance of the account", async () => {
                const { erc721, account } = await loadFixture(deploy)
    
                await expect(erc721.mint(account.address)).to.changeTokenBalances(
                    erc721,
                    [account.address],
                    [1]
                )
            })
    
            it("Check that token emission correctly changes the _tokenId", async () => {
                const { erc721, account } = await loadFixture(deploy)
    
                const tokenId = await erc721.getTokenId()
    
                const tx = await erc721.mint(account.address)
                await tx.wait()
    
                expect(await erc721.getTokenId())
                .to.equal(tokenId.add(1))
            })
    
            it("Check that the owner of the token is set correctly", async () => {
                const { erc721, account } = await loadFixture(deploy)
    
                const tx = await erc721.mint(account.address)
                await tx.wait()
    
                const tokenId = await erc721.getTokenId()
    
                expect(await erc721.ownerOf(tokenId))
                .to.equal(account.address)
            })
    
            it("Check that the URI of the token is returned correctly", async () => {
                const { erc721, account, baseURI } = await loadFixture(deploy)
    
                const tx = await erc721.mint(account.address)
                await tx.wait()
    
                const tokenId = await erc721.getTokenId()
    
                expect(await erc721.tokenURI(tokenId))
                .to.equal(baseURI + tokenId)
            })
        })
    
        describe("Event", () => {
            it("Check emit an event on Transfer", async () => {
                const { erc721, account } = await loadFixture(deploy)
    
                const tokenId = await erc721.getTokenId()
                const zeroAddress = "0x0000000000000000000000000000000000000000"
    
                await expect(erc721.mint(account.address))
                    .to.emit(erc721, "Transfer")
                    .withArgs(zeroAddress, account.address, tokenId.add(1))
            })
        })
    })

    describe("setApprovalForAll", () => {
        describe("setApprovalForAll", () => {
            it("Check that the function setApprovalForAll correctly set true", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
    
                const approve = true
                const tx = await erc721.setApprovalForAll(account.address, approve)
                await tx.wait()
    
                expect(await erc721.isApprovedForAll(owner.address, account.address))
                .to.equal(approve)
            })
    
            it("Check that the function setApprovalForAll correctly set false", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
    
                const approve = false
                const tx = await erc721.setApprovalForAll(account.address, approve)
                await tx.wait()
    
                expect(await erc721.isApprovedForAll(owner.address, account.address))
                .to.equal(approve)
            })
        })
    
        describe("Event", () => {
            it("Check emit an event on setApprovalForAll", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
    
                const approve = true
                const tx = await erc721.setApprovalForAll(account.address, approve)
                await tx.wait()
    
                await expect(erc721.setApprovalForAll(account.address, approve))
                    .to.emit(erc721, "ApprovalForAll")
                    .withArgs(owner.address, account.address, approve)
            })
        })
    })
    
    describe("Approve", () => {
        describe("Requires check that", () => {
            it("Can't approve a token if you don't own it", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(erc721.connect(hacker).approve(hacker.address, tokenId))
                .to.be.revertedWith("ERC721: approve caller is not owner or approved operator")
            })

            it("Can't approve a token if you don't operator for this token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.getApproved(tokenId))
                await expect(erc721.connect(hacker).approve(hacker.address, tokenId))
                .to.be.revertedWith("ERC721: approve caller is not owner or approved operator")
            })

            it("Can't approve a token if you don't operator for all token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(true).to.not.equal(await erc721.isApprovedForAll(account.address, hacker.address))
                await expect(erc721.connect(hacker).approve(hacker.address, tokenId))
                .to.be.revertedWith("ERC721: approve caller is not owner or approved operator")
            })
        })

        describe("Approve", () => {
            it("Check that the function approve works correctly", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)

                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                tx = await erc721.connect(account).approve(operator.address, tokenId)
                await tx.wait()

                expect(await erc721.getApproved(tokenId))
                .to.equal(operator.address)
            })
        })

        describe("Event", () => {
            it("Check emit an event on Approval", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
    
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721.connect(account).approve(operator.address, tokenId))
                    .to.emit(erc721, "Approval")
                    .withArgs(account.address, operator.address, tokenId)
            })
        })
    })



    describe("TransferFrom", () => {
        describe("Requires check that", () => {
            it("Can't transfer a token with a non-existent id", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721.connect(hacker).transferFrom(account.address, hacker.address, tokenId.add(1)))
                .to.be.revertedWith("ERC721: Token with this id does not exist")
                await expect(erc721.connect(hacker).transferFrom(account.address, hacker.address, 0))
                .to.be.revertedWith("ERC721: Token with this id does not exist")
            })

            it("Can't transfer a token if from does not own a token", async () => {
                const { erc721, owner, account, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(erc721.transferFrom(hacker.address, account.address, tokenId))
                .to.be.revertedWith("ERC721: transfer from incorrect owner")
            })

            it("Can't transfer a token to zero address", async () => {
                const { erc721, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(hacker.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(erc721.connect(hacker).transferFrom(hacker.address, zeroAddress, tokenId))
                .to.be.revertedWith("ERC721: transfer to the zero address")
            })

            it("Can't transfer a token if caller don't own it", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(erc721.connect(hacker).transferFrom(account.address, hacker.address, tokenId))
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token if caller don't operator for this token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.getApproved(tokenId))
                await expect(erc721.connect(hacker).transferFrom(account.address, hacker.address, tokenId))
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token if caller don't operator for all token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(true).to.not.equal(await erc721.isApprovedForAll(account.address, hacker.address))
                await expect(erc721.connect(hacker).transferFrom(account.address, hacker.address, tokenId))
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })
        })

        describe("Check that the function transferFrom", () => {
            it("Correctly change balance. Caller - token owner", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721.transferFrom(owner.address, account.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - token owner", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.transferFrom(owner.address, account.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - operator of token", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                await expect(erc721.connect(operator).transferFrom(owner.address, account.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of token", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                tx = await erc721.transferFrom(owner.address, account.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })
            
            it("Correctly change balance. Caller - operator of all tokens", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                await expect(erc721.connect(operator).transferFrom(owner.address, account.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of all tokens", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)
                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                tx = await erc721.connect(operator).transferFrom(owner.address, account.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })
        })

        describe("Event", () => {
            it("Check emit an event on Transfer", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
    
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721.transferFrom(owner.address ,account.address, tokenId))
                    .to.emit(erc721, "Transfer")
                    .withArgs(owner.address, account.address, tokenId)
            })
        })
    })

    describe("safeTransferFrom(address, address, uint256)", () => {
        describe("Requires check that", () => {
            it("Can't transfer a token with a non-existent id", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256)"](account.address, hacker.address, tokenId.add(1))
                )
                .to.be.revertedWith("ERC721: Token with this id does not exist")
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256)"](account.address, hacker.address, 0)
                )
                .to.be.revertedWith("ERC721: Token with this id does not exist")
            })

            it("Can't transfer a token if from does not own a token", async () => {
                const { erc721, owner, account, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(erc721["safeTransferFrom(address,address,uint256)"](hacker.address, account.address, tokenId))
                .to.be.revertedWith("ERC721: transfer from incorrect owner")
            })

            it("Can't transfer a token to zero address", async () => {
                const { erc721, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(hacker.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256)"](hacker.address, zeroAddress, tokenId)
                )
                .to.be.revertedWith("ERC721: transfer to the zero address")
            })

            it("Can't transfer a token if caller don't own it", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256)"](account.address, hacker.address, tokenId)
                )
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token if caller don't operator for this token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.getApproved(tokenId))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256)"](account.address, hacker.address, tokenId)
                )
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token if caller don't operator for all token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                expect(true).to.not.equal(await erc721.isApprovedForAll(account.address, hacker.address))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256)"](account.address, hacker.address, tokenId)
                )
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token to a contract that does not support onERC721Received", async () => {
                const { erc721, notErc721Received, owner, account } = await loadFixture(deploy)

                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721["safeTransferFrom(address,address,uint256)"](owner.address, notErc721Received.address, tokenId))
                .to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer")
            })
        })

        describe("Check that the function safeTransferFrom(address, address, uint256)", () => {
            it("Correctly change balance. Caller - token owner. Receiver - EOA", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - token owner. Receiver - EOA", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - operator of token. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                await expect(erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of token. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })
            
            it("Correctly change balance. Caller - operator of all tokens. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                await expect(erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of all tokens. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)
                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - token owner. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721["safeTransferFrom(address,address,uint256)"](owner.address, erc721Received.address, tokenId)).to.changeTokenBalances(
                    erc721,
                    [owner.address, erc721Received.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - token owner. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721["safeTransferFrom(address,address,uint256)"](owner.address, erc721Received.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(erc721Received.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - operator of token. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                await expect(
                    erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, erc721Received.address, tokenId)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, erc721Received.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of token. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, erc721Received.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(erc721Received.address).to.equal(await erc721.ownerOf(tokenId))
            })
            
            it("Correctly change balance. Caller - operator of all tokens. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                await expect(
                    erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, erc721Received.address, tokenId)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, erc721Received.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of all tokens. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)
                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256)"](owner.address, erc721Received.address, tokenId)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(erc721Received.address).to.equal(await erc721.ownerOf(tokenId))
            })
        })

        describe("Event", () => {
            it("Check emit an event on Transfer", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
    
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()

                await expect(erc721["safeTransferFrom(address,address,uint256)"](owner.address, account.address, tokenId))
                    .to.emit(erc721, "Transfer")
                    .withArgs(owner.address, account.address, tokenId)
            })
        })
    })

    describe("safeTransferFrom(address, address, uint256, bytes)", () => {
        describe("Requires check that", () => {
            it("Can't transfer a token with a non-existent id", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(account.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256,bytes)"](account.address, hacker.address, tokenId.add(1), data)
                )
                .to.be.revertedWith("ERC721: Token with this id does not exist")
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256,bytes)"](account.address, hacker.address, 0, data)
                )
                .to.be.revertedWith("ERC721: Token with this id does not exist")
            })

            it("Can't transfer a token if from does not own a token", async () => {
                const { erc721, owner, account, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(erc721["safeTransferFrom(address,address,uint256,bytes)"](hacker.address, account.address, tokenId, data))
                .to.be.revertedWith("ERC721: transfer from incorrect owner")
            })

            it("Can't transfer a token to zero address", async () => {
                const { erc721, hacker } = await loadFixture(deploy)

                let tx = await erc721.mint(hacker.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                const zeroAddress = "0x0000000000000000000000000000000000000000"

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256,bytes)"](hacker.address, zeroAddress, tokenId, data)
                )
                .to.be.revertedWith("ERC721: transfer to the zero address")
            })

            it("Can't transfer a token if you don't own it", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.ownerOf(tokenId))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256,bytes)"](account.address, hacker.address, tokenId, data)
                )
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token if you don't operator for this token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                expect(hacker).to.not.equal(await erc721.getApproved(tokenId))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256,bytes)"](account.address, hacker.address, tokenId, data)
                )
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token if you don't operator for all token", async () => {
                const { erc721, account, hacker } = await loadFixture(deploy)
                
                let tx = await erc721.mint(account.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                expect(true).to.not.equal(await erc721.isApprovedForAll(account.address, hacker.address))
                await expect(
                    erc721.connect(hacker)["safeTransferFrom(address,address,uint256,bytes)"](account.address, hacker.address, tokenId, data)
                )
                .to.be.revertedWith("ERC721: transfer caller is not owner or approved operator")
            })

            it("Can't transfer a token to a contract that does not support onERC721Received", async () => {
                const { erc721, notErc721Received, owner, account } = await loadFixture(deploy)

                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                await expect(
                    erc721["safeTransferFrom(address,address,uint256,bytes)"](owner.address, notErc721Received.address, tokenId, data)
                )
                .to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer")
            })
        })

        describe("Check that the function safeTransferFrom(address, address, uint256, bytes)", () => {
            it("Correctly change balance. Caller - token owner. Receiver - EOA", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                await expect(
                    erc721["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - token owner. Receiver - EOA", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - operator of token. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                await expect(
                    erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of token. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })
            
            it("Correctly change balance. Caller - operator of all tokens. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                await expect(
                    erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, account.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of all tokens. Receiver - EOA", async () => {
                const { erc721, owner, account, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(account.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - token owner. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                

                await expect(
                    erc721["safeTransferFrom(address,address,uint256,bytes)"](owner.address, erc721Received.address, tokenId, data)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, erc721Received.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - token owner. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721["safeTransferFrom(address,address,uint256,bytes)"](owner.address, erc721Received.address, tokenId, data)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(erc721Received.address).to.equal(await erc721.ownerOf(tokenId))
            })

            it("Correctly change balance. Caller - operator of token. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                await expect(
                    erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, erc721Received.address, tokenId, data)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, erc721Received.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of token. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.approve(operator.address, tokenId)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, erc721Received.address, tokenId, data)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(erc721Received.address).to.equal(await erc721.ownerOf(tokenId))
            })
            
            it("Correctly change balance. Caller - operator of all tokens. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                await expect(
                    erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, erc721Received.address, tokenId, data)
                ).to.changeTokenBalances(
                    erc721,
                    [owner.address, erc721Received.address],
                    [-1, 1]
                )
            })

            it("Correctly change token owner. Caller - operator of all tokens. Receiver - Contract", async () => {
                const { erc721, owner, erc721Received, operator } = await loadFixture(deploy)
                
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()
                const tokenOwner = await erc721.ownerOf(tokenId)

                tx = await erc721.setApprovalForAll(operator.address, true)
                await tx.wait()

                tx = await erc721.connect(operator)["safeTransferFrom(address,address,uint256,bytes)"](owner.address, erc721Received.address, tokenId, data)
                await tx.wait()

                expect(tokenOwner).to.not.equal(await erc721.ownerOf(tokenId))
                expect(erc721Received.address).to.equal(await erc721.ownerOf(tokenId))
            })
        })

        describe("Event", () => {
            it("Check emit an event on Transfer", async () => {
                const { erc721, owner, account } = await loadFixture(deploy)
    
                let tx = await erc721.mint(owner.address)
                await tx.wait()

                const data = ethers.utils.randomBytes(1)
                const tokenId = await erc721.getTokenId()

                await expect(erc721["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account.address, tokenId, data))
                    .to.emit(erc721, "Transfer")
                    .withArgs(owner.address, account.address, tokenId)
            })
        })
    })

    describe("SupportsInterface", () => {
        it("Check that function works correctly with IERC721 interfaceId", async () => {
            const { erc721 } = await loadFixture(deploy)

            const IERC721interfaceId = "0x80ac58cd"

            expect(await erc721.supportsInterface(IERC721interfaceId)).to.equal(true)
        })

        it("Check that function works correctly with IERC721Metadata interfaceId", async () => {
            const { erc721 } = await loadFixture(deploy)

            const IERC721MetadatainterfaceId = "0x80ac58cd"

            expect(await erc721.supportsInterface(IERC721MetadatainterfaceId)).to.equal(true)
        })

        it("Check that function works correctly with IERC165 interfaceId", async () => {
            const { erc721 } = await loadFixture(deploy)

            const IERC165interfaceId = "0x80ac58cd"

            expect(await erc721.supportsInterface(IERC165interfaceId)).to.equal(true)
        })

        it("Check that function works correctly with any another interfaceId", async () => {
            const { erc721 } = await loadFixture(deploy)

            let randomInterface = ethers.utils.hexlify(ethers.utils.randomBytes(4))
            const IERC721interfaceId = "0x80ac58cd"
            const IERC721MetadatainterfaceId = "0x80ac58cd"
            const IERC165interfaceId = "0x80ac58cd"

            while(randomInterface == IERC721interfaceId ||
                randomInterface == IERC721MetadatainterfaceId ||
                randomInterface == IERC165interfaceId
            ){
                randomInterface = ethers.utils.hexlify(ethers.utils.randomBytes(4))
            }
            expect(await erc721.supportsInterface(randomInterface)).to.equal(false)
        })
    })

    describe("tokenURI", () => {
        describe("Require", () => {
            it("Check that you cannot get the uri of a token that does not exist", async () => {
                const { erc721 } = await loadFixture(deploy)

                const tokenId = await erc721.getTokenId()

                await expect( erc721.tokenURI(tokenId.add(1)))
                .to.revertedWith("ERC721: URI query for nonexistent token")
            })
        })

        describe("tokenURI", () => {
            it("Check the correctness of the function", async () => {
                const { erc721, owner } = await loadFixture(deploy)

                const tx = await erc721.mint(owner.address)
                await tx.wait()

                const tokenId = await erc721.getTokenId()
                const baseUrl = await erc721.getBaseUri()

                expect(await erc721.tokenURI(tokenId)).to.equal(baseUrl + tokenId)
            })
        })
    })
})
