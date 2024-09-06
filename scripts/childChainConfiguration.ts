import { abi as ArbOwner__abi } from '@arbitrum/nitro-contracts/build/contracts/src/precompiles/ArbOwner.sol/ArbOwner.json'
import { abi as ArbGasInfo__abi } from '@arbitrum/nitro-contracts/build/contracts/src/precompiles/ArbGasInfo.sol/ArbGasInfo.json'
import { ethers } from 'ethers'
import { ChildChainConfig } from './childChainConfigType'
import fs from 'fs'

export async function childChainConfiguration(
  privateKey: string,
  PARENT_CHAIN_RPC_URL: string,
  ORBIT_RPC_URL: string
) {
  if (!privateKey || !PARENT_CHAIN_RPC_URL || !ORBIT_RPC_URL) {
    throw new Error('Required environment variable not found')
  }

  // Generating providers from RPCs
  const parentChainProvider = new ethers.providers.JsonRpcProvider(PARENT_CHAIN_RPC_URL)
  const childChainProvider = new ethers.providers.JsonRpcProvider(ORBIT_RPC_URL)

  // Creating the wallet and signer
  const parentChainSigner = new ethers.Wallet(privateKey).connect(parentChainProvider)
  const childChainSigner = new ethers.Wallet(privateKey).connect(childChainProvider)

  // Read the JSON configuration
  const configRaw = fs.readFileSync(
    './config/orbitSetupScriptConfig.json',
    'utf-8'
  )
  const config: ChildChainConfig = JSON.parse(configRaw)

  // Reading params for L3 Configuration
const minL2BaseFee = config.minL2BaseFee
  const networkFeeReceiver = config.networkFeeReceiver
  const infrastructureFeeCollector = config.infrastructureFeeCollector
  const chainOwner = config.chainOwner

  // Check if the Private Key provided is the chain owner:
  if (childChainSigner.address !== chainOwner) {
    throw new Error('The Private Key you have provided is not the chain owner')
  }

  // ArbOwner precompile setup
  const arbOwnerABI = ArbOwner__abi

  // Arb Owner precompile address
  const arbOwnerAddress = '0x0000000000000000000000000000000000000070'
  const ArbOwner = new ethers.Contract(arbOwnerAddress, arbOwnerABI, childChainSigner)

  // Call the isChainOwner function and check the response
  const isSignerChainOwner = await ArbOwner.isChainOwner(childChainSigner.address)
  if (!isSignerChainOwner) {
    throw new Error('The address you have provided is not the chain owner')
  }

  // Set the network base fee
  console.log('Setting the Minimum Base Fee for the Orbit chain')
  const tx = await ArbOwner.setMinimumL2BaseFee(minL2BaseFee)

  // Wait for the transaction to be mined
  const receipt = await tx.wait()
  console.log(
    `Minimum Base Fee is set on the block number ${await receipt.blockNumber} on the Orbit chain`
  )

  // Check the status of the transaction: 1 is successful, 0 is failure
  if (receipt.status === 0) {
    throw new Error('Transaction failed, could not set the Minimum base fee')
  }

  // Set the network fee receiver
  console.log('Setting the  network fee receiver for the Orbit chain')
  const tx2 = await ArbOwner.setNetworkFeeAccount(networkFeeReceiver)

  // Wait for the transaction to be mined
  const receipt2 = await tx2.wait()
  console.log(
    `network fee receiver is set on the block number ${await receipt2.blockNumber} on the Orbit chain`
  )

  // Check the status of the transaction: 1 is successful, 0 is failure
  if (receipt2.status === 0) {
    throw new Error(
      'network fee receiver Setting network fee receiver transaction failed'
    )
  }

  // Set the infrastructure fee collector
  console.log(
    'Setting the infrastructure fee collector address for the Orbit chain'
  )
  const tx3 = await ArbOwner.setInfraFeeAccount(infrastructureFeeCollector)

  // Wait for the transaction to be mined
  const receipt3 = await tx3.wait()
  console.log(
    `infrastructure fee collector address is set on the block number ${await receipt3.blockNumber} on the Orbit chain`
  )

  // Check the status of the transaction: 1 is successful, 0 is failure
  if (receipt3.status === 0) {
    throw new Error(
      'Setting Set the infrastructure fee collector transaction failed'
    )
  }

  console.log('Getting base fee estimate')
  const baseFee = await parentChainProvider.getGasPrice()
  console.log(`Setting parent chain base fee estimate on Orbit chain to ${baseFee}`)
  const tx4 = await ArbOwner.setL1PricePerUnit(baseFee)

  // Wait for the transaction to be mined
  const receipt4 = await tx4.wait()
  console.log(
    `L1 base fee estimate is set on the block number ${await receipt4.blockNumber} on the Orbit chain`
  )

  // Check the status of the transaction: 1 is successful, 0 is failure
  if (receipt4.status === 0) {
    throw new Error('Base Fee Setting failed')
  }

  console.log('All things done! Enjoy your Orbit chain. LFG 🚀🚀🚀🚀')
}
