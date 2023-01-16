import { ethers } from "hardhat"

async function main(){
    const name = "TestToken"
    const symbol = "TT"
    const baseURI = "https://baseUri/"
    const [owner, account] = await ethers.getSigners()

    // deploy token
    const ERC721 = await ethers.getContractFactory("ERC721")
    const erc721 = await ERC721.deploy(name, symbol, baseURI)

    console.log(`Erc721 token deployed at address ${erc721.address}`)

    // mint token
    let tx = await erc721.mint(owner.address)
    await tx.wait()
    
    let ownerBalance = await erc721.balanceOf(owner.address)
    console.log(`Token minted`)
    console.log(`Owner balance ${ownerBalance}`)

    // transfer token
    const tokenId = await erc721.getTokenId()
    tx = await erc721.transferFrom(owner.address, account.address, tokenId)
    await tx.wait()

    ownerBalance = await erc721.balanceOf(owner.address)
    let accountBalance = await erc721.balanceOf(account.address)
    console.log(`Token transfered`)
    console.log(`Owner balance ${ownerBalance}`)
    console.log(`Account balance ${accountBalance}`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})