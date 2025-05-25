jest.setTimeout(30000);

// Mock external services for E2E tests
global.mockExternalServices = {
  // Add any external service mocks here
};

beforeAll(async () => {
  console.log('🚀 Starting E2E test suite');
});

afterAll(async () => {
  console.log('🛑 E2E test suite completed');
});
