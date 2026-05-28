package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.enums.Arcana;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TarotCardRepository extends JpaRepository<TarotCardEntity, Long> {

    List<TarotCardEntity> findAllByArcana(Arcana arcana);
}
