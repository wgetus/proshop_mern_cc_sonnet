import {
  ORDER_DETAILS_FAIL,
  ORDER_DETAILS_REQUEST,
  ORDER_DETAILS_SUCCESS,
} from '../constants/orderConstants'
import { orderDetailsReducer } from './orderReducers'

describe('orderDetailsReducer characterization', () => {
  it('returns the current default state when state is undefined and action is unknown', () => {
    expect(orderDetailsReducer(undefined, { type: 'UNKNOWN_ACTION' })).toEqual({
      loading: true,
      orderItems: [],
      shippingAddress: {},
    })
  })

  it('returns the same state object for unknown actions when state is provided', () => {
    const state = {
      loading: false,
      orderItems: [{ product: 'abc123', qty: 2 }],
      shippingAddress: { city: 'Berlin' },
      extra: 'kept',
    }

    expect(orderDetailsReducer(state, { type: 'UNKNOWN_ACTION' })).toBe(state)
  })

  it('sets loading while preserving the existing state on request', () => {
    const state = {
      loading: false,
      orderItems: [{ product: 'abc123', qty: 2 }],
      shippingAddress: { city: 'Berlin' },
      staleOrder: { _id: 'old-order' },
    }

    expect(
      orderDetailsReducer(state, { type: ORDER_DETAILS_REQUEST })
    ).toEqual({
      loading: true,
      orderItems: [{ product: 'abc123', qty: 2 }],
      shippingAddress: { city: 'Berlin' },
      staleOrder: { _id: 'old-order' },
    })
  })

  it('stores a normal order payload under order on success', () => {
    const order = {
      _id: 'order123',
      orderItems: [{ name: 'Airpods', qty: 1, price: 89.99 }],
      shippingAddress: { address: '123 Main St' },
    }

    expect(
      orderDetailsReducer(undefined, {
        type: ORDER_DETAILS_SUCCESS,
        payload: order,
      })
    ).toEqual({
      loading: false,
      order,
    })
  })

  it('stores an empty array payload under order on success', () => {
    // # This asserts current buggy behavior. Correct would be: reject or normalize a non-order payload.
    expect(
      orderDetailsReducer(undefined, {
        type: ORDER_DETAILS_SUCCESS,
        payload: [],
      })
    ).toEqual({
      loading: false,
      order: [],
    })
  })

  it('stores null under order on success', () => {
    // # This asserts current buggy behavior. Correct would be: keep an order-shaped object or enter an error state.
    expect(
      orderDetailsReducer(undefined, {
        type: ORDER_DETAILS_SUCCESS,
        payload: null,
      })
    ).toEqual({
      loading: false,
      order: null,
    })
  })

  it('stores malformed payloads under order on success', () => {
    // # This asserts current buggy behavior. Correct would be: validate the payload shape before storing it.
    expect(
      orderDetailsReducer(
        { loading: true, orderItems: [{ product: 'old' }] },
        {
          type: ORDER_DETAILS_SUCCESS,
          payload: 'not an order',
        }
      )
    ).toEqual({
      loading: false,
      order: 'not an order',
    })
  })

  it('stores the fail payload under error', () => {
    expect(
      orderDetailsReducer(undefined, {
        type: ORDER_DETAILS_FAIL,
        payload: 'Order not found',
      })
    ).toEqual({
      loading: false,
      error: 'Order not found',
    })
  })

  it('stores null under error on fail', () => {
    expect(
      orderDetailsReducer(undefined, {
        type: ORDER_DETAILS_FAIL,
        payload: null,
      })
    ).toEqual({
      loading: false,
      error: null,
    })
  })

  it('throws when action is missing', () => {
    expect(() => orderDetailsReducer(undefined, undefined)).toThrow(
      "Cannot read properties of undefined (reading 'type')"
    )
  })
})
