#### NOTICE: The solidity code is unaudited and is for demo purposes. Use at your own risk!

# MerkleTree.js Solidity NFT Whitelist example

> Allow NFT minting only to whitelisted accounts by verifying merkle proof in [Solidity](https://github.com/ethereum/solidity) contract. Merkle root and merkle proofs are constructed using [MerkleTree.js](https://github.com/miguelmota/merkletreejs).

## Example

[`contracts/WhitelistSale.sol`](./contracts/WhitelistSale.sol)

```solidity
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract WhitelistSale is ERC721 {
  bytes32 immutable public merkleRoot;
  uint256 public nextTokenId;
  mapping(address => bool) public claimed;

  constructor(bytes32 _merkleRoot) ERC721("ExampleNFT", "NFT") {
    merkleRoot = _merkleRoot;
  }

  function toBytes32(address addr) pure internal returns (bytes32) {
    return bytes32(uint256(uint160(addr)));
  }

  function mint(bytes32[] calldata merkleProof) public payable {
    require(claimed[msg.sender] == false, "already claimed");
    claimed[msg.sender] = true;
    require(MerkleProof.verify(merkleProof, merkleRoot, toBytes32(msg.sender)) == true, "invalid merkle proof");
    nextTokenId++;
    _mint(msg.sender, nextTokenId);
  }
}
```

[`test/whitelistSale.js`](./test/whitelistSale.js)

```javascript
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
```

## Development

Install dependencies

```shell
npm install
```

Run test

```shell
npm test
```

# License

[MIT](LICENSE)
