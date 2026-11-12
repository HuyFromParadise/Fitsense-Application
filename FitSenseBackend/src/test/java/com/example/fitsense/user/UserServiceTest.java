package com.example.fitsense.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.dto.UserUpdateRequest;
import com.example.fitsense.user.entity.UserEntity;
import com.example.fitsense.user.repository.UserRepository;
import com.example.fitsense.user.service.UserService;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getOrCreateCurrentUser_createsOnFirstLogin() {
        CurrentUser authUser = new CurrentUser("uid-123", "runner@fitsense.app");
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.empty());
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse res = userService.getOrCreateCurrentUser(authUser);

        assertThat(res.id()).isNotNull();
        assertThat(res.email()).isEqualTo("runner@fitsense.app");
        assertThat(res.displayName()).isEqualTo("runner");
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    void updateCurrentUser_computesBmiCorrectly() {
        CurrentUser authUser = new CurrentUser("uid-123", "runner@fitsense.app");
        UserEntity existing = UserEntity.builder()
                .firebaseUid("uid-123")
                .email("runner@fitsense.app")
                .build();
        existing.setId(UUID.randomUUID());

        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        UserUpdateRequest req = new UserUpdateRequest(
                "Kiet Runner",
                null,
                new BigDecimal("175.0"),
                new BigDecimal("70.0"),
                "male",
                "intermediate",
                null
        );

        UserResponse res = userService.updateCurrentUser(authUser, req);

        assertThat(res.displayName()).isEqualTo("Kiet Runner");
        assertThat(res.bmi()).isEqualTo(22.9);
    }
}
