
type hyperSyncConfig = {endpointUrl: string}
type hyperFuelConfig = {endpointUrl: string}

@genType.opaque
type rpcConfig = {
  syncConfig: Config.sourceSync,
}

@genType
type syncSource = HyperSync(hyperSyncConfig) | HyperFuel(hyperFuelConfig) | Rpc(rpcConfig)

@genType.opaque
type aliasAbi = Ethers.abi

type eventName = string

type contract = {
  name: string,
  abi: aliasAbi,
  addresses: array<string>,
  events: array<eventName>,
}

type configYaml = {
  syncSource,
  startBlock: int,
  confirmedBlockThreshold: int,
  contracts: dict<contract>,
  lowercaseAddresses: bool,
}

let publicConfig = ChainMap.fromArrayUnsafe([
  {
    let contracts = Js.Dict.fromArray([
      (
        "BondFactory",
        {
          name: "BondFactory",
          abi: Types.BondFactory.abi,
          addresses: [
            "0x4fA228e2eADF00248D770527bfb15c536a8A40bF",
          ],
          events: [
            Types.BondFactory.PoolCreated.name,
          ],
        }
      ),
      (
        "BondToken",
        {
          name: "BondToken",
          abi: Types.BondToken.abi,
          addresses: [
          ],
          events: [
            Types.BondToken.Transfer.name,
            Types.BondToken.Approval.name,
          ],
        }
      ),
      (
        "BondSeries",
        {
          name: "BondSeries",
          abi: Types.BondSeries.abi,
          addresses: [
          ],
          events: [
            Types.BondSeries.OwnershipTransferred.name,
          ],
        }
      ),
    ])
    let chain = ChainMap.Chain.makeUnsafe(~chainId=5042002)
    (
      chain,
      {
        confirmedBlockThreshold: 200,
        syncSource: Rpc({syncConfig: NetworkSources.getSyncConfig({})}),
        startBlock: 0,
        contracts,
        lowercaseAddresses: false
      }
    )
  },
])

@genType
let getGeneratedByChainId: int => configYaml = chainId => {
  let chain = ChainMap.Chain.makeUnsafe(~chainId)
  if !(publicConfig->ChainMap.has(chain)) {
    Js.Exn.raiseError(
      "No chain with id " ++ chain->ChainMap.Chain.toString ++ " found in config.yaml",
    )
  }
  publicConfig->ChainMap.get(chain)
}
