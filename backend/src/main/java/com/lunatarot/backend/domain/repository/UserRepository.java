package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByTgUserId(Long tgUserId);

    List<UserEntity> findAllByConversationState(BotConversationState state);
}
