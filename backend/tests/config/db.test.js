jest.mock('mongoose', () => ({ connect: jest.fn() }));

const mongoose = require('mongoose');
const connectDB = require('../../config/db');

describe('connectDB', () => {
  let exitSpy;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('connects using MONGO_URI and logs the host', async () => {
    mongoose.connect.mockResolvedValue({ connection: { host: 'db.example.com' } });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
    expect(logSpy).toHaveBeenCalledWith('MongoDB Connected: db.example.com');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits the process when the connection fails', async () => {
    mongoose.connect.mockRejectedValue(new Error('connection refused'));

    await connectDB();

    expect(errorSpy).toHaveBeenCalledWith('MongoDB Error: connection refused');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
