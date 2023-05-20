const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { storeImages, storeTokenUriMetaData } = require("../utils/uploadToPinata")


const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('2')
const imagesLocation = './images/random'
let tokenUris = [
    'ipfs://QmQ29qcsnsiVYhEGdPHAQ9T2wkkZGTRHnbr7yTc5AaT5E4',
    'ipfs://QmU2mn5rqej3CJEQLSZyHE2xHWmbE1qemMnK9fBkRT1rV1',
    'ipfs://QmYNbAsLBkPMPuUsTbhjn6iS6WpyaRXGajECVZr8tZZmRK'
]
const metaDataTemplate = {
    name: '',
    description: '',
    image: '',
    attributes: [
        {
            trait_type: 'Cuteness',
            value: 200
        }
    ]
}

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (process.env.UPLOAD_TO_PINATA === 'true') {
        tokenUris = await handleTokenUris()
    }

    let vrfCoordinatorV2Address, subscribtionId

    if (developmentChains.includes(network.name)) {

        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscribtionId = transactionReceipt.events[0].args.subId

        await vrfCoordinatorV2Mock.fundSubscription(subscribtionId, VRF_SUB_FUND_AMOUNT)

    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]['vrfCoordinatorV2']
        subscribtionId = networkConfig[chainId]['subscriptionId']
    }

    const mintFee = networkConfig[chainId]['mintFee']
    const gasLane = networkConfig[chainId]['gasLane']
    const gasLimit = networkConfig[chainId]['gasLimit']

    const args = [
        vrfCoordinatorV2Address,
        gasLane,
        subscribtionId,
        gasLimit,
        tokenUris,
        mintFee,
    ]

    const RandomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_PRIVATE_KEY) {

        await verify(RandomIpfsNft.address, args)

    }

    log('---------------------')

}

async function handleTokenUris() {

    tokenUris = []
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)

    for (const index in imageUploadResponses) {

        let tokenUriData = { ...metaDataTemplate }

        tokenUriData.name = files[index].replace('.png', '')
        tokenUriData.description = `An adorable ${tokenUriData.name} pug!`
        tokenUriData.image = `ipfs://${imageUploadResponses[index].IpfsHash}`
        console.log(`Uploading ${tokenUriData.name}...`)

        //store the JSON to pinata / IPFS
        const uploadMetaDataResponse = await storeTokenUriMetaData(tokenUriData)
        tokenUris.push(`ipfs://${uploadMetaDataResponse.IpfsHash}`)

    }

    console.log('TokenUris Uploaded! They are:')
    console.log(tokenUris)

    return tokenUris

}

module.exports.tags = ["all", "RandomNft", "main"]
