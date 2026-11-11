package com.example.fitsense.user.service;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.dto.UserUpdateRequest;
import com.example.fitsense.user.entity.UserEntity;
import com.example.fitsense.user.repository.UserRepository;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public UserResponse getOrCreateCurrentUser(CurrentUser authUser) {
        if (authUser == null || authUser.uid() == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication credentials required");
        }

        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseGet(() -> createNewUser(authUser));

        return UserResponse.fromEntity(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(CurrentUser authUser, UserUpdateRequest request) {
        if (authUser == null || authUser.uid() == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication credentials required");
        }

        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseGet(() -> createNewUser(authUser));

        if (request.displayName() != null) {
            user.setDisplayName(request.displayName());
        }
        if (request.birthDate() != null) {
            user.setBirthDate(request.birthDate());
        }
        if (request.heightCm() != null) {
            user.setHeightCm(request.heightCm());
        }
        if (request.weightKg() != null) {
            user.setWeightKg(request.weightKg());
        }
        if (request.gender() != null) {
            user.setGender(request.gender());
        }
        if (request.fitnessLevel() != null) {
            user.setFitnessLevel(request.fitnessLevel());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl());
        }

        UserEntity savedUser = userRepository.save(user);

        // Mirror profile to Firestore (best-effort, skipped if FirebaseApp not active)
        syncToFirestore(savedUser);

        return UserResponse.fromEntity(savedUser);
    }

    @Transactional
    public void deleteCurrentUser(CurrentUser authUser) {
        if (authUser == null || authUser.uid() == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication credentials required");
        }

        userRepository.findByFirebaseUid(authUser.uid()).ifPresent(user -> {
            userRepository.delete(user);
            log.info("Deleted user {} from MySQL", user.getId());
        });

        // Delete from Firestore & Firebase Auth if Firebase is configured
        if (!FirebaseApp.getApps().isEmpty()) {
            try {
                Firestore firestore = FirestoreClient.getFirestore();
                firestore.collection("users").document(authUser.uid()).delete();
                FirebaseAuth.getInstance().deleteUser(authUser.uid());
                log.info("Deleted user {} from Firestore and Firebase Auth", authUser.uid());
            } catch (Exception e) {
                log.warn("Failed to clean up Firebase Auth/Firestore for {}: {}", authUser.uid(), e.getMessage());
            }
        }
    }

    private UserEntity createNewUser(CurrentUser authUser) {
        String email = (authUser.email() != null && !authUser.email().isBlank())
                ? authUser.email()
                : authUser.uid() + "@fitsense.local";

        String defaultName = authUser.email() != null ? authUser.email().split("@")[0] : "FitSense User";

        UserEntity newUser = UserEntity.builder()
                .firebaseUid(authUser.uid())
                .email(email)
                .displayName(defaultName)
                .build();

        newUser.setId(java.util.UUID.randomUUID());
        UserEntity saved = userRepository.save(newUser);
        log.info("Auto-created new user with id={} for firebase_uid={}", saved.getId(), saved.getFirebaseUid());

        syncToFirestore(saved);
        return saved;
    }

    private void syncToFirestore(UserEntity user) {
        if (FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try {
            Firestore firestore = FirestoreClient.getFirestore();
            Map<String, Object> profileData = new HashMap<>();
            profileData.put("id", user.getId().toString());
            profileData.put("email", user.getEmail());
            profileData.put("displayName", user.getDisplayName());
            profileData.put("birthDate", user.getBirthDate() != null ? user.getBirthDate().toString() : null);
            profileData.put("heightCm", user.getHeightCm() != null ? user.getHeightCm().doubleValue() : null);
            profileData.put("weightKg", user.getWeightKg() != null ? user.getWeightKg().doubleValue() : null);
            profileData.put("gender", user.getGender());
            profileData.put("fitnessLevel", user.getFitnessLevel());
            profileData.put("avatarUrl", user.getAvatarUrl());
            profileData.put("bmi", user.calculateBmi());

            firestore.collection("users")
                    .document(user.getFirebaseUid())
                    .collection("profile")
                    .document("main")
                    .set(profileData);
            log.debug("Successfully mirrored profile of {} to Firestore", user.getFirebaseUid());
        } catch (Exception e) {
            log.warn("Could not sync profile to Firestore for {}: {}", user.getFirebaseUid(), e.getMessage());
        }
    }
}
