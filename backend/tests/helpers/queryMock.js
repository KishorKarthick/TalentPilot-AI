// Helpers for stubbing Mongoose query builders in unit tests.

// Builds a thenable object whose chainable methods (populate/sort/skip/limit/select)
// return itself, mimicking a Mongoose Query that resolves to `result`.
const chainableQuery = (result) => {
  const query = {
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  for (const method of ['populate', 'sort', 'skip', 'limit', 'select', 'lean']) {
    query[method] = jest.fn(() => query);
  }
  return query;
};

// Minimal Mongoose model mock with the statics used across the routes.
const modelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  create: jest.fn(),
});

module.exports = { chainableQuery, modelMock };
