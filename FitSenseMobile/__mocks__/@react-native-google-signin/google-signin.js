let signInResponse = { type: 'cancelled', data: null };

const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(async () => signInResponse),
  signOut: jest.fn(async () => null),
  revokeAccess: jest.fn(async () => null),
};

const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  NULL_PRESENTER: 'NULL_PRESENTER',
};

function isCancelledResponse(response) {
  return response.type === 'cancelled';
}

function isSuccessResponse(response) {
  return response.type === 'success';
}

function __setSignInResponse(response) {
  signInResponse = response;
}

function __reset() {
  signInResponse = { type: 'cancelled', data: null };
  GoogleSignin.configure.mockClear();
  GoogleSignin.hasPlayServices.mockClear();
  GoogleSignin.signIn.mockClear();
  GoogleSignin.signOut.mockClear();
}

module.exports = {
  GoogleSignin,
  statusCodes,
  isCancelledResponse,
  isSuccessResponse,
  __setSignInResponse,
  __reset,
};
