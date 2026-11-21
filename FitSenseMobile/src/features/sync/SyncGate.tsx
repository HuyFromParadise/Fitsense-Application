import { useEffect, useRef } from 'react';

import { syncManager } from '../../services/sync';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * F8: bật/tắt sync theo phiên đăng nhập. Không sửa AuthProvider (A sở hữu);
 * đăng xuất thì xoá dữ liệu local của user cũ để không rò sang tài khoản sau.
 */
export function SyncGate() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const wasAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      syncManager.start();
    } else {
      syncManager.stop();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      syncManager.clearLocalData().catch(() => {});
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  return null;
}
