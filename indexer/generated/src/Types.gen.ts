/* TypeScript file generated from Types.res by genType. */

/* eslint-disable */
/* tslint:disable */

import type {Activity_t as Entities_Activity_t} from '../src/db/Entities.gen';

import type {BondToken_t as Entities_BondToken_t} from '../src/db/Entities.gen';

import type {HandlerContext as $$handlerContext} from './Types.ts';

import type {HandlerWithOptions as $$fnWithEventConfig} from './bindings/OpaqueTypes.ts';

import type {Pool_t as Entities_Pool_t} from '../src/db/Entities.gen';

import type {SingleOrMultiple as $$SingleOrMultiple_t} from './bindings/OpaqueTypes';

import type {UserPosition_t as Entities_UserPosition_t} from '../src/db/Entities.gen';

import type {eventOptions as Internal_eventOptions} from 'envio/src/Internal.gen';

import type {genericContractRegisterArgs as Internal_genericContractRegisterArgs} from 'envio/src/Internal.gen';

import type {genericContractRegister as Internal_genericContractRegister} from 'envio/src/Internal.gen';

import type {genericEvent as Internal_genericEvent} from 'envio/src/Internal.gen';

import type {genericHandlerArgs as Internal_genericHandlerArgs} from 'envio/src/Internal.gen';

import type {genericHandler as Internal_genericHandler} from 'envio/src/Internal.gen';

import type {logger as Envio_logger} from 'envio/src/Envio.gen';

import type {t as Address_t} from 'envio/src/Address.gen';

export type id = string;
export type Id = id;

export type contractRegistrations = {
  readonly log: Envio_logger; 
  readonly addBondFactory: (_1:Address_t) => void; 
  readonly addBondSeries: (_1:Address_t) => void; 
  readonly addBondToken: (_1:Address_t) => void
};

export type entityHandlerContext<entity,indexedFieldOperations> = {
  readonly get: (_1:id) => Promise<(undefined | entity)>; 
  readonly getOrThrow: (_1:id, message:(undefined | string)) => Promise<entity>; 
  readonly getWhere: indexedFieldOperations; 
  readonly getOrCreate: (_1:entity) => Promise<entity>; 
  readonly set: (_1:entity) => void; 
  readonly deleteUnsafe: (_1:id) => void
};

export type handlerContext = $$handlerContext;

export type activity = Entities_Activity_t;
export type Activity = activity;

export type bondToken = Entities_BondToken_t;
export type BondToken = bondToken;

export type pool = Entities_Pool_t;
export type Pool = pool;

export type userPosition = Entities_UserPosition_t;
export type UserPosition = userPosition;

export type Transaction_t = {};

export type Block_t = {
  readonly number: number; 
  readonly timestamp: number; 
  readonly hash: string
};

export type AggregatedBlock_t = {
  readonly hash: string; 
  readonly number: number; 
  readonly timestamp: number
};

export type AggregatedTransaction_t = {};

export type eventLog<params> = Internal_genericEvent<params,Block_t,Transaction_t>;
export type EventLog<params> = eventLog<params>;

export type SingleOrMultiple_t<a> = $$SingleOrMultiple_t<a>;

export type HandlerTypes_args<eventArgs,context> = { readonly event: eventLog<eventArgs>; readonly context: context };

export type HandlerTypes_contractRegisterArgs<eventArgs> = Internal_genericContractRegisterArgs<eventLog<eventArgs>,contractRegistrations>;

export type HandlerTypes_contractRegister<eventArgs> = Internal_genericContractRegister<HandlerTypes_contractRegisterArgs<eventArgs>>;

export type HandlerTypes_eventConfig<eventFilters> = Internal_eventOptions<eventFilters>;

export type fnWithEventConfig<fn,eventConfig> = $$fnWithEventConfig<fn,eventConfig>;

export type contractRegisterWithOptions<eventArgs,eventFilters> = fnWithEventConfig<HandlerTypes_contractRegister<eventArgs>,HandlerTypes_eventConfig<eventFilters>>;

export type BondFactory_chainId = 5042002;

export type BondFactory_PoolCreated_eventArgs = {
  readonly poolId: bigint; 
  readonly bondToken: Address_t; 
  readonly bondSeries: Address_t; 
  readonly maturityDate: bigint; 
  readonly name: string; 
  readonly symbol: string
};

export type BondFactory_PoolCreated_block = Block_t;

export type BondFactory_PoolCreated_transaction = Transaction_t;

export type BondFactory_PoolCreated_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: BondFactory_PoolCreated_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: BondFactory_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: BondFactory_PoolCreated_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: BondFactory_PoolCreated_block
};

export type BondFactory_PoolCreated_handlerArgs = Internal_genericHandlerArgs<BondFactory_PoolCreated_event,handlerContext,void>;

export type BondFactory_PoolCreated_handler = Internal_genericHandler<BondFactory_PoolCreated_handlerArgs>;

export type BondFactory_PoolCreated_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<BondFactory_PoolCreated_event,contractRegistrations>>;

export type BondFactory_PoolCreated_eventFilter = {
  readonly poolId?: SingleOrMultiple_t<bigint>; 
  readonly bondToken?: SingleOrMultiple_t<Address_t>; 
  readonly bondSeries?: SingleOrMultiple_t<Address_t>
};

export type BondFactory_PoolCreated_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: BondFactory_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type BondFactory_PoolCreated_eventFiltersDefinition = 
    BondFactory_PoolCreated_eventFilter
  | BondFactory_PoolCreated_eventFilter[];

export type BondFactory_PoolCreated_eventFilters = 
    BondFactory_PoolCreated_eventFilter
  | BondFactory_PoolCreated_eventFilter[]
  | ((_1:BondFactory_PoolCreated_eventFiltersArgs) => BondFactory_PoolCreated_eventFiltersDefinition);

export type BondSeries_chainId = 5042002;

export type BondSeries_OwnershipTransferred_eventArgs = { readonly previousOwner: Address_t; readonly newOwner: Address_t };

export type BondSeries_OwnershipTransferred_block = Block_t;

export type BondSeries_OwnershipTransferred_transaction = Transaction_t;

export type BondSeries_OwnershipTransferred_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: BondSeries_OwnershipTransferred_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: BondSeries_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: BondSeries_OwnershipTransferred_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: BondSeries_OwnershipTransferred_block
};

export type BondSeries_OwnershipTransferred_handlerArgs = Internal_genericHandlerArgs<BondSeries_OwnershipTransferred_event,handlerContext,void>;

export type BondSeries_OwnershipTransferred_handler = Internal_genericHandler<BondSeries_OwnershipTransferred_handlerArgs>;

export type BondSeries_OwnershipTransferred_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<BondSeries_OwnershipTransferred_event,contractRegistrations>>;

export type BondSeries_OwnershipTransferred_eventFilter = { readonly previousOwner?: SingleOrMultiple_t<Address_t>; readonly newOwner?: SingleOrMultiple_t<Address_t> };

export type BondSeries_OwnershipTransferred_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: BondSeries_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type BondSeries_OwnershipTransferred_eventFiltersDefinition = 
    BondSeries_OwnershipTransferred_eventFilter
  | BondSeries_OwnershipTransferred_eventFilter[];

export type BondSeries_OwnershipTransferred_eventFilters = 
    BondSeries_OwnershipTransferred_eventFilter
  | BondSeries_OwnershipTransferred_eventFilter[]
  | ((_1:BondSeries_OwnershipTransferred_eventFiltersArgs) => BondSeries_OwnershipTransferred_eventFiltersDefinition);

export type BondToken_chainId = 5042002;

export type BondToken_Transfer_eventArgs = {
  readonly from: Address_t; 
  readonly to: Address_t; 
  readonly value: bigint
};

export type BondToken_Transfer_block = Block_t;

export type BondToken_Transfer_transaction = Transaction_t;

export type BondToken_Transfer_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: BondToken_Transfer_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: BondToken_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: BondToken_Transfer_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: BondToken_Transfer_block
};

export type BondToken_Transfer_handlerArgs = Internal_genericHandlerArgs<BondToken_Transfer_event,handlerContext,void>;

export type BondToken_Transfer_handler = Internal_genericHandler<BondToken_Transfer_handlerArgs>;

export type BondToken_Transfer_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<BondToken_Transfer_event,contractRegistrations>>;

export type BondToken_Transfer_eventFilter = { readonly from?: SingleOrMultiple_t<Address_t>; readonly to?: SingleOrMultiple_t<Address_t> };

export type BondToken_Transfer_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: BondToken_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type BondToken_Transfer_eventFiltersDefinition = 
    BondToken_Transfer_eventFilter
  | BondToken_Transfer_eventFilter[];

export type BondToken_Transfer_eventFilters = 
    BondToken_Transfer_eventFilter
  | BondToken_Transfer_eventFilter[]
  | ((_1:BondToken_Transfer_eventFiltersArgs) => BondToken_Transfer_eventFiltersDefinition);

export type BondToken_Approval_eventArgs = {
  readonly owner: Address_t; 
  readonly spender: Address_t; 
  readonly value: bigint
};

export type BondToken_Approval_block = Block_t;

export type BondToken_Approval_transaction = Transaction_t;

export type BondToken_Approval_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: BondToken_Approval_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: BondToken_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: BondToken_Approval_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: BondToken_Approval_block
};

export type BondToken_Approval_handlerArgs = Internal_genericHandlerArgs<BondToken_Approval_event,handlerContext,void>;

export type BondToken_Approval_handler = Internal_genericHandler<BondToken_Approval_handlerArgs>;

export type BondToken_Approval_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<BondToken_Approval_event,contractRegistrations>>;

export type BondToken_Approval_eventFilter = { readonly owner?: SingleOrMultiple_t<Address_t>; readonly spender?: SingleOrMultiple_t<Address_t> };

export type BondToken_Approval_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: BondToken_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type BondToken_Approval_eventFiltersDefinition = 
    BondToken_Approval_eventFilter
  | BondToken_Approval_eventFilter[];

export type BondToken_Approval_eventFilters = 
    BondToken_Approval_eventFilter
  | BondToken_Approval_eventFilter[]
  | ((_1:BondToken_Approval_eventFiltersArgs) => BondToken_Approval_eventFiltersDefinition);

export type chainId = number;

export type chain = 5042002;
