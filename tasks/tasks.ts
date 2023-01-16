import { task } from "hardhat/config";
import '@nomiclabs/hardhat-ethers'

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners()

    for (const account of accounts) {
        console.log(account.address)
    }
})

// mint function
task("mint", "mint NFT token")
    .addParam("adr")
    .addParam("to")
    .setAction(async (args, hre) => {
        // connect to contract
        const ERC721 = await hre.ethers.getContractFactory("ERC721")
        const erc721 = ERC721.attach(args.adr)

        // save balance before mint
        const balanceBefore = await erc721.balanceOf(args.to)

        // mint token
        const tx = await erc721.mint(args.to)
        await tx.wait()

        // save balance after mint
        const balanceAfter = await erc721.balanceOf(args.to)

        console.log("The mint was successful")
        console.log(`The balance of the ${args.to} address has changed from ${balanceBefore} to ${balanceAfter}`)
})

// функция mint для ERC721
task("transfer", "transfer NFT token")
    .addParam("adr")
    .addParam("from")
    .addParam("to")
    .addParam("tokenId")
    .setAction(async (args, hre) => {
        // connect to contract
        const ERC721 = await hre.ethers.getContractFactory("ERC721")
        const erc721 = ERC721.attach(args.adr)

        // save balance before transfer
        const balanceFromBefore = await erc721.balanceOf(args.from)
        const balanceToBefore = await erc721.balanceOf(args.to)

        // transfer token
        const tx = await erc721.transferFrom(args.from, args.to, args.value)
        await tx.wait()

        // save balance after transfer
        const balanceFromAfter = await erc721.balanceOf(args.from)
        const balanceToAfter = await erc721.balanceOf(args.to)

        console.log("The transfer was successful.")
        console.log(`The balance of the ${args.from} address has changed from ${balanceFromBefore} to ${balanceFromAfter}`)
        console.log(`The balance of the ${args.to} address has changed from ${balanceToBefore} to ${balanceToAfter}`)
})