/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import User from '../../models/User.js';
const authController = require('../../controllers/authController'); // keep using require

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create a dummy express app for testing
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount your routes manually in the test app
  app.get('/login', authController.renderLogin);
  app.get('/register', authController.renderRegister);
  app.post('/login', authController.loginUser);
  app.post('/register', authController.registerUser);
  app.post('/logout', authController.logoutUser);
  app.get('/', authController.authenticateToken, (req, res) => {
    res.status(200).json({ message: 'Home', user: req.user });
  });
  app.get('/collections', authController.authenticateToken, (req, res) => {
    res.status(200).json({ message: 'Collections', user: req.user });
  });
  app.get('/explore', authController.checkAuth, (req, res) => {
    res.status(200).json({ user: req.user, isAuthenticated: req.isAuthenticated });
  });
  app.get('/api/user', authController.authenticateToken, authController.getCurrentUser);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});
describe('Auth Routes Integration Tests', () => {

 
  
  test('GET / - should deny access without token', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(302);
  });

  

  test('GET /explore - should work for non-authenticated users', async () => {
    const res = await request(app).get('/explore');
    expect(res.statusCode).toBe(200);
    expect(res.body.isAuthenticated).toBe(false);
  });

});
