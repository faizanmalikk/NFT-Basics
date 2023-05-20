// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//errors
error RandomIpfsNft__OutOfRangeBounds();
error RandomIpfsNft__NeedMoreEth();
error RandomIpfsNft__TransactionFailed();
error RandomIpfsNft__AlreadyInitialized();

import "hardhat/console.sol";

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    //Type Declerations
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    //ChainLink VRF Variables
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimits;

    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    VRFCoordinatorV2Interface private immutable i_vrfConrdinator;

    //VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender;

    //NFT Vaiables
    uint256 private s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_tokenUris;
    uint256 private immutable s_mintFee;
    bool private s_initialized;
    bool private _transactionFailed;

    //events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2, // adddress
        bytes32 gaslane,
        uint64 subscription_id,
        uint32 gasLimit,
        string[3] memory tokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS Nft", "DOG") {
        i_vrfConrdinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gaslane;
        i_subscriptionId = subscription_id;
        i_callbackGasLimits = gasLimit;
        s_tokenUris = tokenUris;
        s_mintFee = mintFee;
        initializeContract(tokenUris);
        s_tokenCounter = 0;
    }

    function initializeContract(string[3] memory tokenUris) private {
        if (s_initialized) {
            revert RandomIpfsNft__AlreadyInitialized();
        }
        s_tokenUris = tokenUris;
        s_initialized = true;
    }

    function rqstNFT() public payable returns (uint256 requestId) {
        if (msg.value < s_mintFee) {
            revert RandomIpfsNft__NeedMoreEth();
        }

        requestId = i_vrfConrdinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimits,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);

        return requestId;
    }

    function fulfillRandomWords(
        uint256 resquestId,
        uint256[] memory randomWords
    ) internal override {
        address dogOwner = s_requestIdToSender[resquestId];
        uint256 newTokenCounter = s_tokenCounter;

        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;

        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        s_tokenCounter += 1;
        _safeMint(dogOwner, newTokenCounter);
        _setTokenURI(newTokenCounter, s_tokenUris[uint256(dogBreed)]);

        emit NftMinted(dogBreed, dogOwner);
    }

    function withdraw() public onlyOwner {
        //call
        (bool callSucess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        if (!callSucess || _transactionFailed) {
            revert RandomIpfsNft__TransactionFailed();
        }
    }

    function setTransactionFailed(bool failed) external {
        _transactionFailed = failed;
    }

    function getBreedFromModdedRng(
        uint256 moddedRng
    ) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            // Pug = 0 - 9  (10%)
            // Shiba-inu = 10 - 39  (30%)
            // St. Bernard = 40 = 99 (60%)
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum = chanceArray[i];
        }
        revert RandomIpfsNft__OutOfRangeBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 40, MAX_CHANCE_VALUE];
    }

    function getMintFee() public view returns (uint256) {
        return s_mintFee;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getInitailized() public view returns (bool) {
        return s_initialized;
    }

    function getTokenUris(uint256 index) public view returns (string memory) {
        return s_tokenUris[index];
    }
}
