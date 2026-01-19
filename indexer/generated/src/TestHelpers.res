/***** TAKE NOTE ******
This is a hack to get genType to work!

In order for genType to produce recursive types, it needs to be at the 
root module of a file. If it's defined in a nested module it does not 
work. So all the MockDb types and internal functions are defined in TestHelpers_MockDb
and only public functions are recreated and exported from this module.

the following module:
```rescript
module MyModule = {
  @genType
  type rec a = {fieldB: b}
  @genType and b = {fieldA: a}
}
```

produces the following in ts:
```ts
// tslint:disable-next-line:interface-over-type-literal
export type MyModule_a = { readonly fieldB: b };

// tslint:disable-next-line:interface-over-type-literal
export type MyModule_b = { readonly fieldA: MyModule_a };
```

fieldB references type b which doesn't exist because it's defined
as MyModule_b
*/

module MockDb = {
  @genType
  let createMockDb = TestHelpers_MockDb.createMockDb
}

@genType
module Addresses = {
  include TestHelpers_MockAddresses
}

module EventFunctions = {
  //Note these are made into a record to make operate in the same way
  //for Res, JS and TS.

  /**
  The arguements that get passed to a "processEvent" helper function
  */
  @genType
  type eventProcessorArgs<'event> = {
    event: 'event,
    mockDb: TestHelpers_MockDb.t,
    @deprecated("Set the chainId for the event instead")
    chainId?: int,
  }

  @genType
  type eventProcessor<'event> = eventProcessorArgs<'event> => promise<TestHelpers_MockDb.t>

  /**
  A function composer to help create individual processEvent functions
  */
  let makeEventProcessor = (~register) => args => {
    let {event, mockDb, ?chainId} =
      args->(Utils.magic: eventProcessorArgs<'event> => eventProcessorArgs<Internal.event>)

    // Have the line here, just in case the function is called with
    // a manually created event. We don't want to break the existing tests here.
    let _ =
      TestHelpers_MockDb.mockEventRegisters->Utils.WeakMap.set(event, register)
    TestHelpers_MockDb.makeProcessEvents(mockDb, ~chainId=?chainId)([event->(Utils.magic: Internal.event => Types.eventLog<unknown>)])
  }

  module MockBlock = {
    @genType
    type t = {
      hash?: string,
      number?: int,
      timestamp?: int,
    }

    let toBlock = (_mock: t) => {
      hash: _mock.hash->Belt.Option.getWithDefault("foo"),
      number: _mock.number->Belt.Option.getWithDefault(0),
      timestamp: _mock.timestamp->Belt.Option.getWithDefault(0),
    }->(Utils.magic: Types.AggregatedBlock.t => Internal.eventBlock)
  }

  module MockTransaction = {
    @genType
    type t = {
    }

    let toTransaction = (_mock: t) => {
    }->(Utils.magic: Types.AggregatedTransaction.t => Internal.eventTransaction)
  }

  @genType
  type mockEventData = {
    chainId?: int,
    srcAddress?: Address.t,
    logIndex?: int,
    block?: MockBlock.t,
    transaction?: MockTransaction.t,
  }

  /**
  Applies optional paramters with defaults for all common eventLog field
  */
  let makeEventMocker = (
    ~params: Internal.eventParams,
    ~mockEventData: option<mockEventData>,
    ~register: unit => Internal.eventConfig,
  ): Internal.event => {
    let {?block, ?transaction, ?srcAddress, ?chainId, ?logIndex} =
      mockEventData->Belt.Option.getWithDefault({})
    let block = block->Belt.Option.getWithDefault({})->MockBlock.toBlock
    let transaction = transaction->Belt.Option.getWithDefault({})->MockTransaction.toTransaction
    let event: Internal.event = {
      params,
      transaction,
      chainId: switch chainId {
      | Some(chainId) => chainId
      | None =>
        switch Generated.configWithoutRegistrations.defaultChain {
        | Some(chainConfig) => chainConfig.id
        | None =>
          Js.Exn.raiseError(
            "No default chain Id found, please add at least 1 chain to your config.yaml",
          )
        }
      },
      block,
      srcAddress: srcAddress->Belt.Option.getWithDefault(Addresses.defaultAddress),
      logIndex: logIndex->Belt.Option.getWithDefault(0),
    }
    // Since currently it's not possible to figure out the event config from the event
    // we store a reference to the register function by event in a weak map
    let _ = TestHelpers_MockDb.mockEventRegisters->Utils.WeakMap.set(event, register)
    event
  }
}


module BondFactory = {
  module PoolCreated = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.BondFactory.PoolCreated.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.BondFactory.PoolCreated.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("poolId")
      poolId?: bigint,
      @as("bondToken")
      bondToken?: Address.t,
      @as("bondSeries")
      bondSeries?: Address.t,
      @as("maturityDate")
      maturityDate?: bigint,
      @as("name")
      name?: string,
      @as("symbol")
      symbol?: string,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?poolId,
        ?bondToken,
        ?bondSeries,
        ?maturityDate,
        ?name,
        ?symbol,
        ?mockEventData,
      } = args

      let params = 
      {
       poolId: poolId->Belt.Option.getWithDefault(0n),
       bondToken: bondToken->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       bondSeries: bondSeries->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       maturityDate: maturityDate->Belt.Option.getWithDefault(0n),
       name: name->Belt.Option.getWithDefault("foo"),
       symbol: symbol->Belt.Option.getWithDefault("foo"),
      }
->(Utils.magic: Types.BondFactory.PoolCreated.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.BondFactory.PoolCreated.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.BondFactory.PoolCreated.event)
    }
  }

}


module BondSeries = {
  module OwnershipTransferred = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.BondSeries.OwnershipTransferred.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.BondSeries.OwnershipTransferred.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("previousOwner")
      previousOwner?: Address.t,
      @as("newOwner")
      newOwner?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?previousOwner,
        ?newOwner,
        ?mockEventData,
      } = args

      let params = 
      {
       previousOwner: previousOwner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       newOwner: newOwner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.BondSeries.OwnershipTransferred.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.BondSeries.OwnershipTransferred.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.BondSeries.OwnershipTransferred.event)
    }
  }

}


module BondToken = {
  module Transfer = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.BondToken.Transfer.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.BondToken.Transfer.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("from")
      from?: Address.t,
      @as("to")
      to?: Address.t,
      @as("value")
      value?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?from,
        ?to,
        ?value,
        ?mockEventData,
      } = args

      let params = 
      {
       from: from->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       to: to->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       value: value->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.BondToken.Transfer.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.BondToken.Transfer.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.BondToken.Transfer.event)
    }
  }

  module Approval = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.BondToken.Approval.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.BondToken.Approval.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("owner")
      owner?: Address.t,
      @as("spender")
      spender?: Address.t,
      @as("value")
      value?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?owner,
        ?spender,
        ?value,
        ?mockEventData,
      } = args

      let params = 
      {
       owner: owner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       spender: spender->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       value: value->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.BondToken.Approval.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.BondToken.Approval.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.BondToken.Approval.event)
    }
  }

}

