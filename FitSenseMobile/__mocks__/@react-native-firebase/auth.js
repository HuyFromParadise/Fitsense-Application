let currentUser = null;
const listeners = new Set();

function notify() {
  listeners.forEach(callback => callback(currentUser));
}

const auth = {
  get currentUser() {
    return currentUser;
  },
  signOut: jest.fn(async () => {
    currentUser = null;
    notify();
  }),
};

function getAuth() {
  return auth;
}

function onAuthStateChanged(_auth, callback) {
  listeners.add(callback);
  callback(currentUser);
  return () => listeners.delete(callback);
}

function makeUser(email = 'test@fitsense.app', displayName = null) {
  return {
    uid: 'uid-1',
    email,
    displayName,
    getIdToken: jest.fn(async () => 'mock-id-token'),
    updateProfile: jest.fn(async () => {}),
  };
}

const signInWithEmailAndPassword = jest.fn(async (_auth, email) => {
  currentUser = makeUser(email);
  notify();
  return { user: currentUser };
});

const createUserWithEmailAndPassword = jest.fn(async (_auth, email) => {
  currentUser = makeUser(email);
  notify();
  return { user: currentUser };
});

const sendPasswordResetEmail = jest.fn(async () => {});
const updateProfile = jest.fn(async (user, profile) => {
  user.displayName = profile.displayName ?? user.displayName;
});

const GoogleAuthProvider = {
  credential: jest.fn((idToken, accessToken) => ({
    providerId: 'google.com',
    token: idToken,
    accessToken,
  })),
};

const signInWithCredential = jest.fn(async (_auth, credential) => {
  currentUser = makeUser('google@fitsense.app', 'Google User');
  currentUser.credential = credential;
  notify();
  return { user: currentUser };
});

function signOut(...args) {
  return auth.signOut(...args);
}

function __setUser(user) {
  currentUser = user;
  notify();
}

function __reset() {
  currentUser = null;
  listeners.clear();
  auth.signOut.mockClear();
  signInWithEmailAndPassword.mockClear();
  createUserWithEmailAndPassword.mockClear();
  signInWithCredential.mockClear();
  GoogleAuthProvider.credential.mockClear();
  sendPasswordResetEmail.mockClear();
}

module.exports = {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  __setUser,
  __reset,
};
