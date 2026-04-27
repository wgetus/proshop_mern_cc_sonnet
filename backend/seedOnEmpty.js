import dotenv from 'dotenv'
import colors from 'colors'
import mongoose from 'mongoose'
import { execFile } from 'child_process'
import { promisify } from 'util'
import connectDB from './config/db.js'
import Product from './models/productModel.js'
import shouldSeed from './utils/shouldSeed.js'

dotenv.config()

const execFileAsync = promisify(execFile)

const seedOnEmpty = async () => {
  try {
    await connectDB()

    const productCount = await Product.countDocuments()

    if (!shouldSeed(productCount)) {
      console.log(`Seed skipped: ${productCount} products already exist`.yellow)
      process.exit(0)
    }

    await mongoose.connection.close()
    console.log('No products found; importing seed data'.cyan)

    const { stdout, stderr } = await execFileAsync('npm', ['run', 'data:import'], {
      env: process.env,
    })

    if (stdout) {
      process.stdout.write(stdout)
    }

    if (stderr) {
      process.stderr.write(stderr)
    }
  } catch (error) {
    console.error(`${error}`.red.inverse)
    process.exit(1)
  }
}

seedOnEmpty()
