import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const port = Number(process.env.PORT || 5000)
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase'
const jwtSecret = process.env.JWT_SECRET || 'comp3133_assignment2_secret'

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
)

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    department: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    profilePicture: { type: String, default: '' },
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)
const Employee = mongoose.model('Employee', employeeSchema)

const typeDefs = `#graphql
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
  }

  type Employee {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    department: String!
    position: String!
    profilePicture: String
  }

  input SignupInput {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input EmployeeInput {
    firstName: String!
    lastName: String!
    email: String!
    department: String!
    position: String!
    profilePicture: String
  }

  input EmployeeUpdateInput {
    firstName: String
    lastName: String
    email: String
    department: String
    position: String
    profilePicture: String
  }

  type LoginPayload {
    token: String!
    user: User!
  }

  type Query {
    employees: [Employee!]!
    employee(id: ID!): Employee
    searchEmployees(department: String, position: String): [Employee!]!
  }

  type Mutation {
    signup(input: SignupInput!): User!
    login(input: LoginInput!): LoginPayload!
    addEmployee(input: EmployeeInput!): Employee!
    updateEmployee(id: ID!, input: EmployeeUpdateInput!): Employee!
    deleteEmployee(id: ID!): Boolean!
  }
`

function requireAuth(contextValue) {
  if (!contextValue.userId) {
    throw new Error('Unauthorized')
  }
}

const resolvers = {
  Query: {
    employees: async (_, __, contextValue) => {
      requireAuth(contextValue)
      return Employee.find().sort({ createdAt: -1 })
    },
    employee: async (_, { id }, contextValue) => {
      requireAuth(contextValue)
      return Employee.findById(id)
    },
    searchEmployees: async (_, { department, position }, contextValue) => {
      requireAuth(contextValue)
      const filter = {}
      if (department && department.trim().length > 0) {
        filter.department = { $regex: department.trim(), $options: 'i' }
      }
      if (position && position.trim().length > 0) {
        filter.position = { $regex: position.trim(), $options: 'i' }
      }
      return Employee.find(filter).sort({ createdAt: -1 })
    },
  },
  Mutation: {
    signup: async (_, { input }) => {
      const existingUser = await User.findOne({ email: input.email.toLowerCase() })
      if (existingUser) {
        throw new Error('Email already in use')
      }

      const passwordHash = await bcrypt.hash(input.password, 10)
      const user = await User.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
      })

      return user
    },
    login: async (_, { input }) => {
      const user = await User.findOne({ email: input.email.toLowerCase() })
      if (!user) {
        throw new Error('Invalid email or password')
      }

      const validPassword = await bcrypt.compare(input.password, user.passwordHash)
      if (!validPassword) {
        throw new Error('Invalid email or password')
      }

      const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' })
      return { token, user }
    },
    addEmployee: async (_, { input }, contextValue) => {
      requireAuth(contextValue)
      const exists = await Employee.findOne({ email: input.email.toLowerCase() })
      if (exists) {
        throw new Error('Employee email already exists')
      }
      const employee = await Employee.create(input)
      return employee
    },
    updateEmployee: async (_, { id, input }, contextValue) => {
      requireAuth(contextValue)
      const employee = await Employee.findByIdAndUpdate(id, input, { new: true, runValidators: true })
      if (!employee) {
        throw new Error('Employee not found')
      }
      return employee
    },
    deleteEmployee: async (_, { id }, contextValue) => {
      requireAuth(contextValue)
      const result = await Employee.findByIdAndDelete(id)
      return Boolean(result)
    },
  },
}

function getUserIdFromAuthHeader(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authorizationHeader.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, jwtSecret)
    return payload.userId || null
  } catch {
    return null
  }
}

async function connectWithRetry(retries = 20, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(mongoUri)
      return
    } catch {
      if (attempt === retries) {
        throw new Error('Failed to connect to MongoDB')
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

async function startServer() {
  await connectWithRetry()

  const app = express()
  const apolloServer = new ApolloServer({ typeDefs, resolvers })
  await apolloServer.start()

  app.use(cors())
  app.use(express.json())

  app.get('/', (_, res) => {
    res.status(200).json({ message: 'Backend is running' })
  })

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const authorizationHeader = req.headers.authorization || ''
        return {
          userId: getUserIdFromAuthHeader(authorizationHeader),
        }
      },
    }),
  )

  app.listen(port, '0.0.0.0')
}

startServer()
