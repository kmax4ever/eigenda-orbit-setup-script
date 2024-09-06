import { ethers } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import fs from 'fs'

// Delay function
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Read the JSON configuration
const configRaw = fs.readFileSync(
  './config/orbitSetupScriptConfig.json',
  'utf-8'
)
const config = JSON.parse(configRaw)
const ERC20InboxAddress = config.inbox

const erc20InboxInterface = new ethers.utils.Interface([
  'function depositERC20(uint256) public returns (uint256)',
])

async function main() {
  const privateKey = process.env.PRIVATE_KEY
  const PARENT_CHAIN_RPC_URL = process.env.PARENT_CHAIN_RPC_URL
  const ORBIT_RPC_URL = process.env.ORBIT_RPC_URL
  const amount = process.env.AMOUNT

  if (!privateKey || !PARENT_CHAIN_RPC_URL || !ORBIT_RPC_URL || !amount) {
    throw new Error('Required environment variable not found')
  }

  const parentChainProvider = new ethers.providers.JsonRpcProvider(PARENT_CHAIN_RPC_URL)
  const orbitChainProvider = new ethers.providers.JsonRpcProvider(ORBIT_RPC_URL)
  const parentChainSigner = new ethers.Wallet(privateKey).connect(parentChainProvider)

  const erc20Inbox = new ethers.Contract(
    ERC20InboxAddress,
    erc20InboxInterface,
    parentChainSigner
  )

  const configRaw = fs.readFileSync(
    './config/orbitSetupScriptConfig.json',
    'utf-8'
  )
  const config = JSON.parse(configRaw)
  const nativeToken = config.nativeToken
  const oldBalance = await orbitChainProvider.getBalance(config.chainOwner)
  let tx
  if (nativeToken === ethers.constants.AddressZero) {
    const inboxAddress = config.inbox
    const depositEthInterface = new ethers.utils.Interface([
      'function depositEth() public payable',
    ])
    // create contract instance
    const contract = new ethers.Contract(
      inboxAddress,
      depositEthInterface,
      parentChainSigner
    )
    // deposit 0.4 ETH
    const tx = await contract.depositEth({
      value: ethers.utils.parseEther('0.4'),
    })
    console.log('Transaction hash on parent chain: ', tx.hash)
    await tx.wait()
    console.log('Transaction has been mined')
    console.log('0.4 ETHs are deposited to your account')
  } else {
    const nativeTokenContract = ERC20__factory.connect(nativeToken, parentChainProvider)
    const decimals = await nativeTokenContract.decimals()
    if (decimals !== 18) {
      throw new Error('We currently only support 18 decimals token')
    }
    tx = await erc20Inbox.depositERC20(
      ethers.utils.parseUnits(amount, decimals)
    )
    console.log('Transaction hash on parent chain: ', tx.hash)
    await tx.wait()
    console.log('Transaction has been mined')
    console.log(amount + ' native tokens are deposited to your account')
  }

  while (true) {
    const newBalance = await orbitChainProvider.getBalance(config.chainOwner)
    if (newBalance.gt(oldBalance)) {
      console.log(
        `LFG! 🚀 Balance of your account on Orbit chain increased by ${amount} Ether.`
      )
      break
    }
    console.log(
      'Balance not changed yet. Waiting for another 30 seconds to receive the funds on the Orbit chain ⏰⏰⏰⏰⏰⏰'
    )
    await delay(30 * 1000)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
