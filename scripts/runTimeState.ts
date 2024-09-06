export interface RuntimeState {
  chainId: number
  etherSent: EtherSent
  nativeTokenDeposit: boolean
  // tokenBridgeDeployed: boolean
  orbitConfig: boolean
  // transferOwnership: boolean
}

interface EtherSent {
  batchPoster: boolean
  staker: boolean
}

export const defaultRunTimeState: RuntimeState = {
  chainId: 0,
  etherSent: {
    batchPoster: false,
    staker: false,
  },
  nativeTokenDeposit: false,
  // tokenBridgeDeployed: false,
  orbitConfig: false,
  // transferOwnership: false,
}
