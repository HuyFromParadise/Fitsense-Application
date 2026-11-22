const messagingInstance = {
  getToken: jest.fn(async () => 'mock-fcm-token'),
  registerDeviceForRemoteMessages: jest.fn(async () => {}),
  requestPermission: jest.fn(async () => 1),
  onMessage: jest.fn(() => () => {}),
  onTokenRefresh: jest.fn(() => () => {}),
  setBackgroundMessageHandler: jest.fn(),
};

function getMessaging() {
  return messagingInstance;
}

const getToken = jest.fn(async () => 'mock-fcm-token');
const registerDeviceForRemoteMessages = jest.fn(async () => {});
const onMessage = jest.fn(() => () => {});
const onTokenRefresh = jest.fn(() => () => {});
const setBackgroundMessageHandler = jest.fn();

module.exports = {
  getMessaging,
  getToken,
  registerDeviceForRemoteMessages,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  default: () => messagingInstance,
};
