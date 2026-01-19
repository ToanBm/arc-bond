module ContractType = {
  @genType
  type t = 
    | @as("BondFactory") BondFactory
    | @as("BondSeries") BondSeries
    | @as("BondToken") BondToken

  let name = "CONTRACT_TYPE"
  let variants = [
    BondFactory,
    BondSeries,
    BondToken,
  ]
  let config = Internal.makeEnumConfig(~name, ~variants)
}

module EntityType = {
  @genType
  type t = 
    | @as("Activity") Activity
    | @as("BondToken") BondToken
    | @as("Pool") Pool
    | @as("UserPosition") UserPosition
    | @as("dynamic_contract_registry") DynamicContractRegistry

  let name = "ENTITY_TYPE"
  let variants = [
    Activity,
    BondToken,
    Pool,
    UserPosition,
    DynamicContractRegistry,
  ]
  let config = Internal.makeEnumConfig(~name, ~variants)
}

let allEnums = ([
  ContractType.config->Internal.fromGenericEnumConfig,
  EntityType.config->Internal.fromGenericEnumConfig,
])
