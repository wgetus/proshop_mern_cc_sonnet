const ORDER_DETAILS_REQUEST = 'ORDER_DETAILS_REQUEST'
const ORDER_DETAILS_SUCCESS = 'ORDER_DETAILS_SUCCESS'
const ORDER_DETAILS_FAIL = 'ORDER_DETAILS_FAIL'

const orderDetailsInitialState = {
  loading: true,
  orderItems: [],
  shippingAddress: {},
}

const requestOrderDetails = (state) => ({
  ...state,
  loading: true,
})

const receiveOrderDetails = (action) => ({
  loading: false,
  order: action.payload,
})

const failOrderDetails = (action) => ({
  loading: false,
  error: action.payload,
})

const orderDetailsHandlers = {
  [ORDER_DETAILS_REQUEST]: requestOrderDetails,
  [ORDER_DETAILS_SUCCESS]: (state, action) => receiveOrderDetails(action),
  [ORDER_DETAILS_FAIL]: (state, action) => failOrderDetails(action),
}

export const orderDetailsReducer = (
  state = orderDetailsInitialState,
  action
) => {
  const handler = orderDetailsHandlers[action.type]

  return handler ? handler(state, action) : state
}
