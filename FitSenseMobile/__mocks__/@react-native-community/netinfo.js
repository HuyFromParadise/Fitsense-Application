const netInfo = {
  fetch: jest.fn(async () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => () => {}),
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
};

module.exports = {
  __esModule: true,
  default: netInfo,
  ...netInfo,
};
