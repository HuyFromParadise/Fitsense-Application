const messagingInstance = {
  getToken: jest.fn(async () => 'mock-fcm-token'),
  registerDeviceForRemoteMessages: jest.fn(async () => {}),
  requestPermission: jest.fn(async () => 1),
  onMessage: jest.fn(() => () => {}),
  setBackgroundMessageHandler: jest.fn(),
};

function getMessaging() {
  return messagingInstance;
}

const getToken = jest.fn(async () => 'mock-fcm-token');
const registerDeviceForRemoteMessages = jest.fn(async () => {});

module.exports = {
  getMessaging,
  getToken,
  registerDeviceForRemoteMessages,
  default: () => messagingInstance,
};
