const { expect, use } = require('chai')
const { ethers } = require('hardhat')
const { MerkleTree } = require('merkletreejs')
const { keccak256 } = ethers.utils

use(require('chai-as-promised'))

describe('WhitelistSale', function () {
  it('allow only whitelisted accounts to mint', async () => {
    const accounts = await hre.ethers.getSigners()
    const whitelisted = accounts.slice(0, 5)
    const notWhitelisted = accounts.slice(5, 10)

    const padBuffer = (addr) => {
      return Buffer.from(addr.substr(2).padStart(32*2, 0), 'hex')
    }

    const leaves = whitelisted.map(account => padBuffer(account.address))
    const tree = new MerkleTree(leaves, keccak256, { sort: true })
    const merkleRoot = tree.getHexRoot()

    const WhitelistSale = await ethers.getContractFactory('WhitelistSale')
    const whitelistSale = await WhitelistSale.deploy(merkleRoot)
    await whitelistSale.deployed()

    const merkleProof = tree.getHexProof(padBuffer(whitelisted[0].address))
    const invalidMerkleProof = tree.getHexProof(padBuffer(notWhitelisted[0].address))

    await expect(whitelistSale.mint(merkleProof)).to.not.be.rejected
    await expect(whitelistSale.mint(merkleProof)).to.be.rejectedWith('already claimed')
    await expect(whitelistSale.connect(notWhitelisted[0]).mint(invalidMerkleProof)).to.be.rejectedWith('invalid merkle proof')
  })
})
