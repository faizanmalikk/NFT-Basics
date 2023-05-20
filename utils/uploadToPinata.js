const pinataSDK = require('@pinata/sdk');
const path = require('path');
const fs = require('fs')

require("dotenv").config()

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

async function storeImages(ImagesFilePath) {
    const fullImagesPath = path.resolve(ImagesFilePath)

    // Filter the files in case the are a file that in not a .png
    const files = fs.readdirSync(fullImagesPath).filter((file) => file.includes(".png"))
    const responses = []

    console.log('Uploading to IPFS!')

    for (const fileIndex in files) {
        console.log(`Working on ${fileIndex}`)

        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)
        const options = {
            pinataMetadata: {
                name: files[fileIndex],
            },
        }

        try {

            await pinata
                .pinFileToIPFS(readableStreamForFile, options)
                .then((result) => {
                    responses.push(result)
                })
                .catch((err) => {
                    console.log(err)
                })


        } catch (error) {
            console.log(error)
        }

    }

    console.log('Uploading Done!')

    return {
        responses,
        files
    }

}

async function storeTokenUriMetaData(metaData) {

    try {

        const response = await pinata.pinJSONToIPFS(metaData)
        return response

    } catch (error) {
        console.log(error)
    }

    return null

}

module.exports = {
    storeImages,
    storeTokenUriMetaData
}