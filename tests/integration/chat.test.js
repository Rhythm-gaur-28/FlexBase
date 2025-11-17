/**
 * @jest-environment node
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import chatRoutes from '../../routes/chat.js';
import User from '../../models/User.js';
import Chat from '../../models/Chat.js';
import Message from '../../models/Message.js';

// Dummy auth middleware
const authRequired = (req, res, next) => {
  req.user = { _id: userId.toString(), username: 'testuser' };
  next();
};

let mongoServer;
let app;
let userId;

// beforeAll(async () => {
//   // Start in-memory MongoDB
//   mongoServer = await MongoMemoryServer.create();
//   await mongoose.connect(mongoServer.getUri());

//   // Create a test user
//   const user = await User.create({ username: 'testuser', password: 'password' });
//   userId = user._id;

//   // Setup Express app
//   app = express();
//   app.use(express.json());

//   // Inject dummy auth middleware and routes
//   app.use((req, res, next) => { req.user = { _id: userId, username: 'testuser' }; next(); });
//   app.use('/', chatRoutes);
// });
beforeAll(async () => {
  // 1. Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // 2. Create test users
  const user = await User.create({
    username: 'testuser',
    email: 'testuser@example.com',  // required by schema
    password: 'password'
  });
  userId = user._id;

  const otherUser = await User.create({
  username: 'otheruser',
  email: 'otheruser@example.com',  // <-- required
  password: 'password'
});

  otherUserId = otherUser._id;
  // 3. Setup Express app
  app = express();
  app.use(express.json());

  // 4. Dummy auth middleware
  app.use((req, res, next) => {
    req.user = { _id: userId, username: 'testuser' };
    next();
  });

  // 5. Mount chat routes
  app.use('/', chatRoutes);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Chat.deleteMany({});
  await Message.deleteMany({});
  await User.deleteMany({});
});

describe('Chat Routes Integration Tests', () => {

  test('GET /chats - should return empty chats and create community chat', async () => {
    const res = await request(app).get('/chats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.chats).toEqual([]);
    expect(res.body.communityChat).toHaveProperty('type', 'community');
  });

  
  test('POST /chats/:chatId/messages - should send a message', async () => {
    const chat = await Chat.create({
      type: 'community',
      name: 'Community Chat',
      participants: [userId],
      createdBy: userId
    });

    const res = await request(app)
      .post(`/chats/${chat._id}/messages`)
      .send({ content: 'Hello world' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message.content).toBe('Hello world');
  });

  test('GET /chats/:chatId/messages - should get messages', async () => {
    const chat = await Chat.create({ type: 'community', participants: [userId], createdBy: userId });
    await Message.create({ chatId: chat._id, sender: userId, content: 'Hello' });

    const res = await request(app).get(`/chats/${chat._id}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('Hello');
  });

});
