const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId


    //Basic NFT
    const BasicNft = await ethers.getContract('BasicNFT', deployer)
    const basicMintTx = await BasicNft.mintNft()
    await basicMintTx.wait(1)
    console.log(`Basic Nft index 0 tokenURL ${await BasicNft.tokenURI(0)}`)

    //Dynamic SVG NF
    const DynamicSvgNft = await ethers.getContract('DynamicNft', deployer)
    const value = ethers.utils.parseEther('4000')
    const dynamicMintTx = await DynamicSvgNft.mintNft(value)
    await dynamicMintTx.wait(1)
    console.log(`Dynamic Nft index 0 tokenURL ${await DynamicSvgNft.tokenURI(0)}`)

    //Random NFT IPFS
    let vrfCoordinatorV2Mock
    const RandomNft = await ethers.getContract('RandomIpfsNft', deployer)
    const subscribtionId = networkConfig[chainId]['subscriptionId']

    if (chainId === 31337) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        await vrfCoordinatorV2Mock.addConsumer(subscribtionId, RandomNft.address)
    }

    const mintFee = await RandomNft.getMintFee()
    const Randomrqst = await RandomNft.rqstNFT({ value: mintFee })
    const RandomrqstTx = await Randomrqst.wait(1)

    await new Promise(async (resolve, reject) => {

        setTimeout(() => reject(), 300000);

        RandomNft.once("NftMinted", async () => {
            console.log('Event Triggered')
            console.log(`Random Nft index 0 tokenURL ${await RandomNft.tokenURI(0)}`)
            resolve()
        })

        if (chainId === 31337) {
            const requestId = await RandomrqstTx.events[1].args.requestId.toString()
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, RandomNft.address)
        }
    })

}

module.exports.tags = ["all", "mint"]
