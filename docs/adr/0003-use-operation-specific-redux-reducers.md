# 0003. Use Operation-Specific Redux Reducers

Status: Accepted

Confidence: HIGH

## Context

The frontend handles many independent asynchronous operations: listing products, loading product details, creating products, updating products, listing users, updating users, creating orders, paying orders, and delivering orders. Each operation needs request, success, failure, and sometimes reset state.

Evidence in code:

- `frontend/src/store.js` combines separate reducer keys such as `productList`, `productDetails`, `productCreate`, `productUpdate`, `userLogin`, `userDetails`, `orderCreate`, `orderPay`, and `orderDeliver`.
- `frontend/src/constants/*Constants.js` defines operation-specific `REQUEST`, `SUCCESS`, `FAIL`, and `RESET` constants.
- `frontend/src/reducers/*Reducers.js` stores loading/error/success/data state per operation instead of one normalized entity cache.
- `frontend/package.json` includes `redux` and `redux-thunk`, but not `@reduxjs/toolkit`, `normalizr`, or a cache/query library.

## Decision

Redux state is split by UI/API operation rather than by normalized domain entities. Each operation has its own reducer state and action constants, and screens select the operation slice they need.

## Alternatives

The repository does not contain commented-out normalized-store code or removed dependencies showing a previous alternative.

Alternatives visible from dependency absence are Redux Toolkit slices, a normalized entity cache, or a query/cache library. None are present in the frontend dependencies or current source.

## Consequences

Positive:

- Screens can track loading, success, and error state for each operation independently.
- The pattern is easy to follow in a React 16 + Redux Thunk codebase.
- Admin mutations and public read flows do not have to share one complex reducer state.

Negative:

- The store has many small slices and repeated reducer/action boilerplate.
- Related product, user, or order data can be duplicated across operation states.
- Keeping detail/list state synchronized after mutations requires explicit reset or refetch actions.
