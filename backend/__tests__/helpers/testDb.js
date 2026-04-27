import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer

const connectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    return
  }

  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  process.env.MONGO_URI = uri

  await mongoose.connect(uri, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
  })
}

const clearTestDb = async () => {
  const collections = mongoose.connection.collections

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
}

const closeTestDb = async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()

  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = undefined
  }
}

export { clearTestDb, closeTestDb, connectTestDb }
