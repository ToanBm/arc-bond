/* TypeScript file generated from Entities.res by genType. */

/* eslint-disable */
/* tslint:disable */

export type id = string;

export type whereOperations<entity,fieldType> = {
  readonly eq: (_1:fieldType) => Promise<entity[]>; 
  readonly gt: (_1:fieldType) => Promise<entity[]>; 
  readonly lt: (_1:fieldType) => Promise<entity[]>
};

export type Activity_t = {
  readonly activityType: string; 
  readonly amount: bigint; 
  readonly bondToken: string; 
  readonly id: id; 
  readonly timestamp: bigint; 
  readonly txHash: string; 
  readonly user: string
};

export type Activity_indexedFieldOperations = {};

export type BondToken_t = {
  readonly id: id; 
  readonly pool_id: id; 
  readonly totalSupply: bigint
};

export type BondToken_indexedFieldOperations = {};

export type Pool_t = {
  readonly bondSeries: string; 
  readonly bondToken: string; 
  readonly createdAt: bigint; 
  readonly id: id; 
  readonly maturityDate: bigint; 
  readonly name: string; 
  readonly poolId: bigint; 
  readonly symbol: string
};

export type Pool_indexedFieldOperations = {};

export type UserPosition_t = {
  readonly balance: bigint; 
  readonly bondToken: string; 
  readonly id: id; 
  readonly user: string
};

export type UserPosition_indexedFieldOperations = {};
