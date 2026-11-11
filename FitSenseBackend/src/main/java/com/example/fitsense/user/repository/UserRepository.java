package com.example.fitsense.user.repository;

import com.example.fitsense.user.entity.UserEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByFirebaseUid(String firebaseUid);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByFirebaseUid(String firebaseUid);
}
