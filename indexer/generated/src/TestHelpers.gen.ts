/* TypeScript file generated from TestHelpers.res by genType. */

/* eslint-disable */
/* tslint:disable */

const TestHelpersJS = require('./TestHelpers.res.js');

import type {BondFactory_PoolCreated_event as Types_BondFactory_PoolCreated_event} from './Types.gen';

import type {BondSeries_OwnershipTransferred_event as Types_BondSeries_OwnershipTransferred_event} from './Types.gen';

import type {BondToken_Approval_event as Types_BondToken_Approval_event} from './Types.gen';

import type {BondToken_Transfer_event as Types_BondToken_Transfer_event} from './Types.gen';

import type {t as Address_t} from 'envio/src/Address.gen';

import type {t as TestHelpers_MockDb_t} from './TestHelpers_MockDb.gen';

/** The arguements that get passed to a "processEvent" helper function */
export type EventFunctions_eventProcessorArgs<event> = {
  readonly event: event; 
  readonly mockDb: TestHelpers_MockDb_t; 
  readonly chainId?: number
};

export type EventFunctions_eventProcessor<event> = (_1:EventFunctions_eventProcessorArgs<event>) => Promise<TestHelpers_MockDb_t>;

export type EventFunctions_MockBlock_t = {
  readonly hash?: string; 
  readonly number?: number; 
  readonly timestamp?: number
};

export type EventFunctions_MockTransaction_t = {};

export type EventFunctions_mockEventData = {
  readonly chainId?: number; 
  readonly srcAddress?: Address_t; 
  readonly logIndex?: number; 
  readonly block?: EventFunctions_MockBlock_t; 
  readonly transaction?: EventFunctions_MockTransaction_t
};

export type BondFactory_PoolCreated_createMockArgs = {
  readonly poolId?: bigint; 
  readonly bondToken?: Address_t; 
  readonly bondSeries?: Address_t; 
  readonly maturityDate?: bigint; 
  readonly name?: string; 
  readonly symbol?: string; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type BondSeries_OwnershipTransferred_createMockArgs = {
  readonly previousOwner?: Address_t; 
  readonly newOwner?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type BondToken_Transfer_createMockArgs = {
  readonly from?: Address_t; 
  readonly to?: Address_t; 
  readonly value?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type BondToken_Approval_createMockArgs = {
  readonly owner?: Address_t; 
  readonly spender?: Address_t; 
  readonly value?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export const MockDb_createMockDb: () => TestHelpers_MockDb_t = TestHelpersJS.MockDb.createMockDb as any;

export const Addresses_mockAddresses: Address_t[] = TestHelpersJS.Addresses.mockAddresses as any;

export const Addresses_defaultAddress: Address_t = TestHelpersJS.Addresses.defaultAddress as any;

export const BondFactory_PoolCreated_processEvent: EventFunctions_eventProcessor<Types_BondFactory_PoolCreated_event> = TestHelpersJS.BondFactory.PoolCreated.processEvent as any;

export const BondFactory_PoolCreated_createMockEvent: (args:BondFactory_PoolCreated_createMockArgs) => Types_BondFactory_PoolCreated_event = TestHelpersJS.BondFactory.PoolCreated.createMockEvent as any;

export const BondSeries_OwnershipTransferred_processEvent: EventFunctions_eventProcessor<Types_BondSeries_OwnershipTransferred_event> = TestHelpersJS.BondSeries.OwnershipTransferred.processEvent as any;

export const BondSeries_OwnershipTransferred_createMockEvent: (args:BondSeries_OwnershipTransferred_createMockArgs) => Types_BondSeries_OwnershipTransferred_event = TestHelpersJS.BondSeries.OwnershipTransferred.createMockEvent as any;

export const BondToken_Transfer_processEvent: EventFunctions_eventProcessor<Types_BondToken_Transfer_event> = TestHelpersJS.BondToken.Transfer.processEvent as any;

export const BondToken_Transfer_createMockEvent: (args:BondToken_Transfer_createMockArgs) => Types_BondToken_Transfer_event = TestHelpersJS.BondToken.Transfer.createMockEvent as any;

export const BondToken_Approval_processEvent: EventFunctions_eventProcessor<Types_BondToken_Approval_event> = TestHelpersJS.BondToken.Approval.processEvent as any;

export const BondToken_Approval_createMockEvent: (args:BondToken_Approval_createMockArgs) => Types_BondToken_Approval_event = TestHelpersJS.BondToken.Approval.createMockEvent as any;

export const Addresses: { mockAddresses: Address_t[]; defaultAddress: Address_t } = TestHelpersJS.Addresses as any;

export const BondFactory: { PoolCreated: { processEvent: EventFunctions_eventProcessor<Types_BondFactory_PoolCreated_event>; createMockEvent: (args:BondFactory_PoolCreated_createMockArgs) => Types_BondFactory_PoolCreated_event } } = TestHelpersJS.BondFactory as any;

export const BondToken: { Transfer: { processEvent: EventFunctions_eventProcessor<Types_BondToken_Transfer_event>; createMockEvent: (args:BondToken_Transfer_createMockArgs) => Types_BondToken_Transfer_event }; Approval: { processEvent: EventFunctions_eventProcessor<Types_BondToken_Approval_event>; createMockEvent: (args:BondToken_Approval_createMockArgs) => Types_BondToken_Approval_event } } = TestHelpersJS.BondToken as any;

export const BondSeries: { OwnershipTransferred: { processEvent: EventFunctions_eventProcessor<Types_BondSeries_OwnershipTransferred_event>; createMockEvent: (args:BondSeries_OwnershipTransferred_createMockArgs) => Types_BondSeries_OwnershipTransferred_event } } = TestHelpersJS.BondSeries as any;

export const MockDb: { createMockDb: () => TestHelpers_MockDb_t } = TestHelpersJS.MockDb as any;
