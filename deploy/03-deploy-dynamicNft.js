const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const fs = require('fs')

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId

    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        ethUsdPriceFeedAddress = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdPriceFeedAddress.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    const lowSvg = fs.readFileSync('./images/dynamic/frown.svg').toString()
    const highSvg = fs.readFileSync('./images/dynamic/happy.svg').toString()

    const args = [ethUsdPriceFeedAddress, lowSvg, highSvg]

    const DynamicNft = await deploy("DynamicNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_PRIVATE_KEY) {

        await verify(DynamicNft.address, args)

    }

    log('---------------------')

}

module.exports.tags = ["all", "DynamicNft",'main']