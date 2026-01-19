  @genType
module BondFactory = {
  module PoolCreated = Types.MakeRegister(Types.BondFactory.PoolCreated)
}

  @genType
module BondSeries = {
  module OwnershipTransferred = Types.MakeRegister(Types.BondSeries.OwnershipTransferred)
}

  @genType
module BondToken = {
  module Transfer = Types.MakeRegister(Types.BondToken.Transfer)
  module Approval = Types.MakeRegister(Types.BondToken.Approval)
}

@genType /** Register a Block Handler. It'll be called for every block by default. */
let onBlock: (
  Envio.onBlockOptions<Types.chain>,
  Envio.onBlockArgs<Types.handlerContext> => promise<unit>,
) => unit = (
  EventRegister.onBlock: (unknown, Internal.onBlockArgs => promise<unit>) => unit
)->Utils.magic
