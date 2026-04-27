import Product from '../backend/models/productModel.js'
import User from '../backend/models/userModel.js'

const seedE2EData = async () => {
  await Product.deleteMany({})
  await User.deleteMany({})

  const adminUser = await User.create({
    name: 'E2E Admin',
    email: 'admin@example.com',
    password: '123456',
    isAdmin: true,
  })

  const regularUser = await User.create({
    name: 'E2E User',
    email: 'john@example.com',
    password: '123456',
    isAdmin: false,
  })

  const products = await Product.insertMany([
    {
      user: adminUser._id,
      name: 'E2E Camera',
      image: '/images/camera.jpg',
      brand: 'Canon',
      category: 'Electronics',
      description: 'A camera seeded for E2E tests',
      rating: 4.5,
      numReviews: 2,
      price: 499.99,
      countInStock: 5,
    },
    {
      user: adminUser._id,
      name: 'E2E Headphones',
      image: '/images/headphones.jpg',
      brand: 'Sony',
      category: 'Electronics',
      description: 'Headphones seeded for E2E tests',
      rating: 4,
      numReviews: 1,
      price: 199.99,
      countInStock: 3,
    },
  ])

  return {
    adminUser,
    regularUser,
    products,
  }
}

export { seedE2EData }
