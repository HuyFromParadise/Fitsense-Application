/** Maps Firebase Auth error codes to user-facing Vietnamese messages. */
export function authErrorMessage(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị khóa.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng.';
    case 'auth/account-exists-with-different-credential':
      return 'Email này đã được đăng ký bằng phương thức khác. Hãy đăng nhập bằng email/mật khẩu.';
    case 'auth/weak-password':
      return 'Mật khẩu phải từ 6 ký tự trở lên.';
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử. Vui lòng chờ giây lát rồi thử lại.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Đăng nhập bằng Email/Mật khẩu chưa được bật trong Firebase Console (Authentication → Sign-in method).';
    case 'auth/network-request-failed':
      return 'Không có kết nối mạng. Vui lòng kiểm tra và thử lại.';
    default:
      return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
