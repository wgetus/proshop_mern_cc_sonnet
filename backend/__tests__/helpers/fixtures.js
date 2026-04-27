import Product from '../../models/productModel.js'
import User from '../../models/userModel.js'

const seedUsersAndProducts = async () => {
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: '123456',
    isAdmin: true,
  })

  const regularUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: '123456',
    isAdmin: false,
  })

  const products = await Product.insertMany([
    {
      user: adminUser._id,
      name: 'Test Camera',
      image: '/images/camera.jpg',
      brand: 'Canon',
      category: 'Electronics',
      description: 'A camera for automated tests',
      rating: 4.5,
      numReviews: 2,
      price: 499.99,
      countInStock: 5,
    },
    {
      user: adminUser._id,
      name: 'Test Headphones',
      image: '/images/headphones.jpg',
      brand: 'Sony',
      category: 'Electronics',
      description: 'Headphones for automated tests',
      rating: 4,
      numReviews: 1,
      price: 199.99,
      countInStock: 3,
    },
  ])

  return {
    users: {
      adminUser,
      regularUser,
    },
    products,
  }
}

export { seedUsersAndProducts }
