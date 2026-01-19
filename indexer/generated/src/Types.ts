// This file is to dynamically generate TS types
// which we can't get using GenType
// Use @genType.import to link the types back to ReScript code

import type { Logger, EffectCaller } from "envio";
import type * as Entities from "./db/Entities.gen.ts";

export type HandlerContext = {
  /**
   * Access the logger instance with event as a context. The logs will be displayed in the console and Envio Hosted Service.
   */
  readonly log: Logger;
  /**
   * Call the provided Effect with the given input.
   * Effects are the best for external calls with automatic deduplication, error handling and caching.
   * Define a new Effect using createEffect outside of the handler.
   */
  readonly effect: EffectCaller;
  /**
   * True when the handlers run in preload mode - in parallel for the whole batch.
   * Handlers run twice per batch of events, and the first time is the "preload" run
   * During preload entities aren't set, logs are ignored and exceptions are silently swallowed.
   * Preload mode is the best time to populate data to in-memory cache.
   * After preload the handler will run for the second time in sequential order of events.
   */
  readonly isPreload: boolean;
  /**
   * Per-chain state information accessible in event handlers and block handlers.
   * Each chain ID maps to an object containing chain-specific state:
   * - isReady: true when the chain has completed initial sync and is processing live events,
   *            false during historical synchronization
   */
  readonly chains: {
    [chainId: string]: {
      readonly isReady: boolean;
    };
  };
  readonly Activity: {
    /**
     * Load the entity Activity from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.Activity_t | undefined>,
    /**
     * Load the entity Activity from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.Activity_t>,
    readonly getWhere: Entities.Activity_indexedFieldOperations,
    /**
     * Returns the entity Activity from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.Activity_t) => Promise<Entities.Activity_t>,
    /**
     * Set the entity Activity in the storage.
     */
    readonly set: (entity: Entities.Activity_t) => void,
    /**
     * Delete the entity Activity from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly BondToken: {
    /**
     * Load the entity BondToken from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.BondToken_t | undefined>,
    /**
     * Load the entity BondToken from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.BondToken_t>,
    readonly getWhere: Entities.BondToken_indexedFieldOperations,
    /**
     * Returns the entity BondToken from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.BondToken_t) => Promise<Entities.BondToken_t>,
    /**
     * Set the entity BondToken in the storage.
     */
    readonly set: (entity: Entities.BondToken_t) => void,
    /**
     * Delete the entity BondToken from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly Pool: {
    /**
     * Load the entity Pool from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.Pool_t | undefined>,
    /**
     * Load the entity Pool from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.Pool_t>,
    readonly getWhere: Entities.Pool_indexedFieldOperations,
    /**
     * Returns the entity Pool from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.Pool_t) => Promise<Entities.Pool_t>,
    /**
     * Set the entity Pool in the storage.
     */
    readonly set: (entity: Entities.Pool_t) => void,
    /**
     * Delete the entity Pool from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly UserPosition: {
    /**
     * Load the entity UserPosition from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.UserPosition_t | undefined>,
    /**
     * Load the entity UserPosition from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.UserPosition_t>,
    readonly getWhere: Entities.UserPosition_indexedFieldOperations,
    /**
     * Returns the entity UserPosition from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.UserPosition_t) => Promise<Entities.UserPosition_t>,
    /**
     * Set the entity UserPosition in the storage.
     */
    readonly set: (entity: Entities.UserPosition_t) => void,
    /**
     * Delete the entity UserPosition from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
};

