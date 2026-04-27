# Architecture

This document maps the current ProShop MERN codebase at container level and highlights the checkout with PayPal payment flow.

## C4 Container Diagram

```mermaid
flowchart LR
  person[Customer or Admin Browser]

  subgraph Frontend
    feIndex[frontend/src/index.js]
    feApp[frontend/src/App.js]
    feStore[frontend/src/store.js]

    homeScreen[frontend/src/screens/HomeScreen.js]
    productScreen[frontend/src/screens/ProductScreen.js]
    cartScreen[frontend/src/screens/CartScreen.js]
    loginScreen[frontend/src/screens/LoginScreen.js]
    registerScreen[frontend/src/screens/RegisterScreen.js]
    profileScreen[frontend/src/screens/ProfileScreen.js]
    shippingScreen[frontend/src/screens/ShippingScreen.js]
    paymentScreen[frontend/src/screens/PaymentScreen.js]
    placeOrderScreen[frontend/src/screens/PlaceOrderScreen.js]
    orderScreen[frontend/src/screens/OrderScreen.js]
    userListScreen[frontend/src/screens/UserListScreen.js]
    userEditScreen[frontend/src/screens/UserEditScreen.js]
    productListScreen[frontend/src/screens/ProductListScreen.js]
    productEditScreen[frontend/src/screens/ProductEditScreen.js]
    orderListScreen[frontend/src/screens/OrderListScreen.js]

    productActions[frontend/src/actions/productActions.js]
    cartActions[frontend/src/actions/cartActions.js]
    userActions[frontend/src/actions/userActions.js]
    orderActions[frontend/src/actions/orderActions.js]
  end

  subgraph Backend
    serverEntry[backend/server.js]
    appEntry[backend/app.js]
    paypalConfigHandler[backend/app.js GET /api/config/paypal handler]
    staticFrontendHandler[backend/app.js production static frontend handler]
    uploadStaticHandler[backend/app.js /uploads static handler]

    productRoutes[backend/routes/productRoutes.js]
    userRoutes[backend/routes/userRoutes.js]
    orderRoutes[backend/routes/orderRoutes.js]
    uploadRoutes[backend/routes/uploadRoutes.js]

    productController[backend/controllers/productController.js]
    userController[backend/controllers/userController.js]
    orderController[backend/controllers/orderController.js]
    uploadHandler[backend/routes/uploadRoutes.js POST /api/upload handler]

    authMiddleware[backend/middleware/authMiddleware.js]
    errorMiddleware[backend/middleware/errorMiddleware.js]
    dbConfig[backend/config/db.js]

    seederCli[backend/seeder.js]
    seedOnEmptyCli[backend/seedOnEmpty.js]
    e2eRunner[e2e/run-playwright.js]
    e2eSeed[e2e/seed.js]
  end

  subgraph Data Layer
    mongo[(MongoDB via MONGO_URI)]
    userModel[backend/models/userModel.js]
    productModel[backend/models/productModel.js]
    orderModel[backend/models/orderModel.js]
    uploadsFs[(uploads/ local filesystem)]
    browserStorage[(Browser localStorage)]
    envVars[(.env / process.env)]
  end

  subgraph External
    paypalSdk[https://www.paypal.com/sdk/js]
    paypalSandbox[PayPal checkout service]
    dockerMongo[(docker-compose MongoDB service)]
    herokuRuntime[Heroku runtime]
  end

  person --> feIndex
  feIndex --> feApp
  feIndex --> feStore

  feApp --> homeScreen
  feApp --> productScreen
  feApp --> cartScreen
  feApp --> loginScreen
  feApp --> registerScreen
  feApp --> profileScreen
  feApp --> shippingScreen
  feApp --> paymentScreen
  feApp --> placeOrderScreen
  feApp --> orderScreen
  feApp --> userListScreen
  feApp --> userEditScreen
  feApp --> productListScreen
  feApp --> productEditScreen
  feApp --> orderListScreen

  homeScreen --> productActions
  productScreen --> productActions
  productScreen --> cartActions
  cartScreen --> cartActions
  shippingScreen --> cartActions
  paymentScreen --> cartActions
  loginScreen --> userActions
  registerScreen --> userActions
  profileScreen --> userActions
  profileScreen --> orderActions
  userListScreen --> userActions
  userEditScreen --> userActions
  productListScreen --> productActions
  productEditScreen --> productActions
  placeOrderScreen --> orderActions
  orderScreen --> orderActions

  cartActions --> browserStorage
  userActions --> browserStorage
  orderActions --> browserStorage
  feStore --> browserStorage

  serverEntry --> dbConfig
  serverEntry --> appEntry
  dbConfig --> mongo
  dockerMongo -. local development .-> mongo
  herokuRuntime -. production process .-> serverEntry

  productActions -->|/api/products| productRoutes
  userActions -->|/api/users| userRoutes
  orderActions -->|/api/orders| orderRoutes
  orderScreen -->|/api/config/paypal| paypalConfigHandler
  productEditScreen -->|/api/upload| uploadRoutes

  appEntry --> productRoutes
  appEntry --> userRoutes
  appEntry --> orderRoutes
  appEntry --> uploadRoutes
  appEntry --> paypalConfigHandler
  appEntry --> staticFrontendHandler
  appEntry --> uploadStaticHandler
  appEntry --> errorMiddleware

  productRoutes --> authMiddleware
  userRoutes --> authMiddleware
  orderRoutes --> authMiddleware
  productRoutes --> productController
  userRoutes --> userController
  orderRoutes --> orderController
  uploadRoutes --> uploadHandler

  productController --> productModel
  userController --> userModel
  orderController --> orderModel
  authMiddleware --> userModel
  uploadHandler --> uploadsFs
  uploadStaticHandler --> uploadsFs
  paypalConfigHandler --> envVars

  userModel --> mongo
  productModel --> mongo
  orderModel --> mongo

  seederCli --> dbConfig
  seederCli --> userModel
  seederCli --> productModel
  seederCli --> orderModel
  seedOnEmptyCli --> dbConfig
  seedOnEmptyCli --> productModel
  seedOnEmptyCli --> seederCli
  e2eRunner --> e2eSeed
  e2eSeed --> appEntry
  e2eSeed --> mongo

  orderScreen -->|loads SDK script| paypalSdk
  paypalSdk --> paypalSandbox
  paypalSandbox -->|paymentResult callback| orderScreen

  placeOrderScreen -->|checkout use-case: create order| orderActions
  orderActions -->|POST /api/orders with JWT| orderRoutes
  orderRoutes --> authMiddleware
  authMiddleware --> userModel
  orderRoutes --> orderController
  orderController -->|save order snapshot| orderModel
  orderModel --> mongo
  orderController -->|201 created order| orderActions
  orderActions -->|clear cartItems| browserStorage
  orderActions -->|redirect to /order/:id| orderScreen
  orderScreen -->|GET /api/orders/:id| orderActions
  orderActions --> orderRoutes
  orderController -->|findById and populate user| orderModel
  orderScreen -->|GET /api/config/paypal| paypalConfigHandler
  paypalConfigHandler -->|PAYPAL_CLIENT_ID| orderScreen
  orderScreen --> paypalSdk
  paypalSandbox -->|approved paymentResult| orderScreen
  orderScreen -->|PUT /api/orders/:id/pay| orderActions
  orderActions --> orderRoutes
  orderController -->|set isPaid, paidAt, paymentResult| orderModel
  orderModel --> mongo
  orderController -->|updated order| orderScreen
```

## Entry Points

- `backend/server.js` starts the Express process, loads environment variables, connects MongoDB, and listens on `PORT`.
- `backend/app.js` mounts API route modules, serves `/uploads`, serves `frontend/build` in production, exposes `GET /api/config/paypal`, and registers error middleware.
- `backend/controllers/productController.js` handles product listing, detail lookup, admin create/update/delete, reviews, and top-rated products.
- `backend/controllers/userController.js` handles login, registration, profile, and admin user management.
- `backend/controllers/orderController.js` handles order creation, order lookup, user order history, admin order listing, PayPal paid updates, and delivery updates.
- `backend/routes/uploadRoutes.js` contains the multer upload handler for `POST /api/upload`.
- `backend/seeder.js` is the import/destroy CLI behind `npm run data:import` and `npm run data:destroy`.
- `backend/seedOnEmpty.js` is the conditional seed CLI behind `npm run data:seed-on-empty`.
- `e2e/run-playwright.js` and `e2e/seed.js` are the Playwright smoke-test command path behind `npm run test:e2e`.
- `frontend/src/index.js` and `frontend/src/App.js` are the SPA browser entry points.
- `frontend/src/actions/*.js` are the browser-side API command handlers used by screens.

## Data Stores

- MongoDB stores users, products, embedded product reviews, and orders through `backend/models/userModel.js`, `backend/models/productModel.js`, and `backend/models/orderModel.js`.
- Browser `localStorage` stores `cartItems`, `shippingAddress`, `paymentMethod`, and `userInfo`.
- `uploads/` stores product image uploads on the local filesystem.
- `.env` / `process.env` provides `MONGO_URI`, `JWT_SECRET`, `PAYPAL_CLIENT_ID`, `PORT`, and `NODE_ENV`.

## External Services

- PayPal checkout is loaded by `frontend/src/screens/OrderScreen.js` from `https://www.paypal.com/sdk/js` using the client ID returned by `GET /api/config/paypal`.
- MongoDB can be local, Docker Compose (`docker-compose.dev.yml` / `docker-compose.yml`), or Atlas in production depending on `MONGO_URI`.
- Heroku is supported by `Procfile` and the `heroku-postbuild` package script.

## Checkout With PayPal Flow

1. The customer builds cart state in `frontend/src/actions/cartActions.js`; the cart is persisted to browser `localStorage`.
2. `frontend/src/screens/PlaceOrderScreen.js` dispatches `createOrder` from `frontend/src/actions/orderActions.js`.
3. `createOrder` sends `POST /api/orders` with the JWT from `userInfo`.
4. `backend/routes/orderRoutes.js` applies `protect` from `backend/middleware/authMiddleware.js`.
5. `backend/controllers/orderController.js` creates an order snapshot through `backend/models/orderModel.js` and persists it in MongoDB.
6. The frontend clears `cartItems` from `localStorage` and navigates to `frontend/src/screens/OrderScreen.js`.
7. `OrderScreen` loads order details through `GET /api/orders/:id`, fetches the PayPal client ID through `GET /api/config/paypal`, and appends the PayPal SDK script.
8. PayPal returns a `paymentResult` callback to `OrderScreen`.
9. `OrderScreen` dispatches `payOrder`, which sends `PUT /api/orders/:id/pay`.
10. `backend/controllers/orderController.js` marks the order paid, stores `paymentResult`, and saves the updated order in MongoDB.
