import { authErrorMessage } from '../authErrors';

test('explains a disabled Email/Password provider', () => {
  expect(authErrorMessage('auth/operation-not-allowed')).toContain('Firebase Console');
});

test('maps wrong credentials to the same message', () => {
  expect(authErrorMessage('auth/wrong-password')).toBe(
    'Email hoặc mật khẩu không chính xác.',
  );
  expect(authErrorMessage('auth/invalid-credential')).toBe(
    'Email hoặc mật khẩu không chính xác.',
  );
});

test('falls back to a generic message for unknown codes', () => {
  expect(authErrorMessage('auth/something-new')).toBe(
    'Đã có lỗi xảy ra. Vui lòng thử lại.',
  );
});
