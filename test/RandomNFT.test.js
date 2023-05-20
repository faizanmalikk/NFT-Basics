const { network, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('RandomNFT unit test', () => {

        let RandomNFT, vrfCoordinatorV2, mintFee, deployer, accounts

        const chainId = network.config.chainId
        subscribtionId = networkConfig[chainId]['subscriptionId']


        beforeEach(async () => {

            deployer = (await getNamedAccounts()).deployer
            accounts = await ethers.getSigners() // could also do with getNamedAccounts

            await deployments.fixture(['all'])

            RandomNFT = await ethers.getContract("RandomIpfsNft", deployer);
            vrfCoordinatorV2 = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            mintFee = await RandomNFT.getMintFee()

            await vrfCoordinatorV2.addConsumer(subscribtionId, RandomNFT.address)

        })

        describe('Contructor', () => {

            it("initiaizes the randomNft correctly", async () => {
                const initailizeState = await RandomNFT.getInitailized()
                const zeroIndexUri = await RandomNFT.getTokenUris(0)

                assert.equal(initailizeState, true)
                assert(zeroIndexUri.includes('ipfs://'))
            })

        })

        describe('Request NFT', () => {

            it("reverts if payment does not send with rqst", async () => {
                await expect(RandomNFT.rqstNFT()).to.be.revertedWithCustomError(RandomNFT, "RandomIpfsNft__NeedMoreEth");
            })

            it("reverts when you don't pay enough mint fee", async () => {
                await expect(RandomNFT.rqstNFT({ value: 0 })).to.be.revertedWithCustomError(RandomNFT, "RandomIpfsNft__NeedMoreEth");
            })

            it("emits an event and kicks off an random word request", async () => {
                await expect(RandomNFT.rqstNFT({ value: mintFee })).to.emit(RandomNFT, 'NftRequested');
            })
        })

        describe("Fulfill RandomWords", () => {

            it("mints Nft after random number is returned", async () => {

                await new Promise(async (resolve, reject) => {
                    RandomNFT.once("NftMinted", async () => {
                        console.log('Event triggered')
                        try {

                            const zeroIndexUri = await RandomNFT.getTokenUris(0)
                            const tokenCounter = await RandomNFT.getTokenCounter()

                            assert(zeroIndexUri.includes('ipfs://'))
                            assert.equal(tokenCounter.toString(), '1')
                            resolve()

                        } catch (e) {
                            reject(e)
                        }
                    });

                    try {
                        const tx = await RandomNFT.rqstNFT({ value: mintFee })
                        const txReceipt = await tx.wait(1)

                        await vrfCoordinatorV2.fulfillRandomWords(
                            txReceipt.events[1].args.requestId,
                            RandomNFT.address
                        )
                    } catch (error) {

                        reject(error)

                    }

                });
            });


        })
        describe("getBreedFromModdedRng", () => {

            it("should return pug if modeRng is smaller then 10", async () => {

                const expectValue = await RandomNFT.getBreedFromModdedRng(9)

                assert.equal(0, expectValue)

            });

            it("should return SHIBA_INU if modeRng is between 10-30", async () => {

                const expectValue = await RandomNFT.getBreedFromModdedRng(18)
                assert.equal(1, expectValue)

            });
            it("should return SHIBA_INU if modeRng is between 10-39", async () => {

                const expectValue = await RandomNFT.getBreedFromModdedRng(38)
                assert.equal(1, expectValue)

            });
            it("should return ST_BERNARD if modeRng is between 40-99", async () => {

                const expectValue = await RandomNFT.getBreedFromModdedRng(95)
                assert.equal(2, expectValue)

            });

            it("should revert if modeRng > 99", async () => {

                await expect(RandomNFT.getBreedFromModdedRng(101)).to.be.revertedWithCustomError(RandomNFT, 'RandomIpfsNft__OutOfRangeBounds')

            });

        })

        describe("withdraw", () => {
            it("should transfer the contract balance to the owner", async () => {

                // Make a payment to the contract
                await RandomNFT.rqstNFT({ value: mintFee });

                const startWithdrawContractBalance = await RandomNFT.provider.getBalance(RandomNFT.address)
                const startWithdrawDeployerBalance = await RandomNFT.provider.getBalance(deployer)

                // Withdraw the contract balance
                const response = await RandomNFT.withdraw();
                const transactionResponse = await response.wait(1)

                const { gasUsed, effectiveGasPrice } = transactionResponse
                const gasCost = gasUsed.mul(effectiveGasPrice)

                // Check the owner's balance after withdrawal
                const endWithdrawContractBalance = await RandomNFT.provider.getBalance(RandomNFT.address)
                const endWithdrawDeployerBalance = await RandomNFT.provider.getBalance(deployer)

                assert.equal(endWithdrawContractBalance, 0)
                assert.equal((startWithdrawContractBalance.add(startWithdrawDeployerBalance)).toString(), (endWithdrawDeployerBalance.add(gasCost)).toString())

            });

            it("should revert if the withdrawal transaction fails", async () => {
                // Mock a failed transaction
                await RandomNFT.setTransactionFailed(true);

                // Make a payment to the contract
                await RandomNFT.rqstNFT({ value: mintFee });

                // Attempt to withdraw the contract balance
                await expect(RandomNFT.withdraw()).to.be.revertedWithCustomError(RandomNFT, "RandomIpfsNft__TransactionFailed");
            });
        });




    })