# 0002. Manually Persist Selected Redux State

Status: Accepted

Confidence: HIGH

## Context

The frontend needs cart and login state to survive page refreshes. Only a subset of Redux state is durable: cart items, shipping address, payment method, and logged-in user information. Loading, error, list, detail, and admin operation state should remain transient.

Evidence in code:

- `frontend/src/store.js` reads `cartItems`, `shippingAddress`, and `userInfo` from `localStorage` to build `initialState`.
- `frontend/src/actions/cartActions.js` writes cart, shipping, and payment method values to `localStorage`.
- `frontend/src/actions/userActions.js` writes `userInfo` on login/register/profile update and removes stored checkout/login values on logout.
- `frontend/src/actions/orderActions.js` removes `cartItems` from `localStorage` after successful order creation.
- `frontend/package.json` includes `redux` and `redux-thunk`, but not `redux-persist`.

## Decision

The app manually persists selected Redux state through direct `localStorage` reads in store initialization and direct `localStorage` writes/removals inside action creators.

## Alternatives

The repository does not contain commented-out persistence middleware or a removed persistence dependency.

The visible alternative is library-managed persistence such as `redux-persist`; it is not present in `frontend/package.json` or the lockfile root dependencies. Another possible alternative is a custom Redux middleware for persistence, but no such middleware exists in `frontend/src/store.js`.

## Consequences

Positive:

- Persistence is explicit and limited to the few values the checkout/login flow needs.
- The app avoids another frontend runtime dependency.
- Transient request state is naturally excluded from persisted state.

Negative:

- Persistence rules are spread across store setup and multiple action files.
- New durable fields require manual reads and writes in the right places.
- Storage errors, malformed JSON, and schema migration are not centralized.
