# 0001. Accept Client-Calculated Order Prices

Status: Accepted

Confidence: HIGH

## Context

The checkout flow needs to create an order containing line items, shipping address, payment method, and totals. The frontend already has cart state and calculates the order summary before the customer submits the order.

Evidence in code:

- `frontend/src/screens/PlaceOrderScreen.js` calculates `itemsPrice`, `shippingPrice`, `taxPrice`, and `totalPrice` from `cart.cartItems`.
- `frontend/src/actions/orderActions.js` sends the whole order object to `POST /api/orders`.
- `backend/controllers/orderController.js` reads `orderItems`, `taxPrice`, `shippingPrice`, and `totalPrice` from `req.body` and saves them into a new `Order`.
- `backend/controllers/orderController.js` does not import `Product`, reload products, or recalculate totals before saving.

## Decision

The order API accepts the order totals and line-item data submitted by the client and persists them as the order record, after only checking that `orderItems` is a non-empty array.

## Alternatives

No commented-out implementation or removed dependency in the repository shows a previously implemented alternative.

The main alternative visible by absence is server-side recalculation: the backend could load each submitted product from MongoDB, validate quantity and stock, recalculate prices/tax/shipping on the server, and reject mismatched totals. There is no code evidence that this path was implemented.

## Consequences

Positive:

- Checkout creation is simple and needs only one API call.
- The backend does not duplicate the frontend's cart-summary calculation logic.
- Orders preserve the exact values submitted by the checkout UI.

Negative:

- The trust boundary is weak: a modified client can submit altered prices, quantities, or totals.
- Product price changes between cart creation and order creation are not reconciled by the backend.
- Any future server-side validation must account for existing orders that were created from client-submitted values.
