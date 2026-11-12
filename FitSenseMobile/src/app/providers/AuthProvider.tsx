import React from 'react';

/**
 * Khung: F1 (A) sẽ nối Firebase onAuthStateChanged -> useAuthStore tại đây.
 * Ngày 1 chỉ bọc children để luồng app chạy được.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
