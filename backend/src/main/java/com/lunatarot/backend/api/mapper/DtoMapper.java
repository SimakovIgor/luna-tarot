package com.lunatarot.backend.api.mapper;

import com.lunatarot.backend.api.dto.MeResponse;
import com.lunatarot.backend.api.dto.ReadingCardDto;
import com.lunatarot.backend.api.dto.ReadingResponse;
import com.lunatarot.backend.api.dto.TarotCardDto;
import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DtoMapper {

    public MeResponse toMe(UserEntity user) {
        return new MeResponse(
            user.getTgUserId(),
            user.getName(),
            user.getGender(),
            user.getBirthDate(),
            user.getZodiac(),
            user.getLifePathNumber(),
            user.getLunarPhase(),
            user.getConversationState()
        );
    }

    public TarotCardDto toCardDto(TarotCardEntity card) {
        return new TarotCardDto(
            card.getId(),
            card.getNumeral(),
            card.getNameRu(),
            card.getNameEn(),
            List.copyOf(card.getKeywords()),
            card.getUprightMeaning(),
            card.getReversedMeaning(),
            card.getImagePath()
        );
    }

    public ReadingResponse toReading(ReadingEntity reading) {
        List<ReadingCardDto> cards = reading.getCards().stream()
            .map(rc -> new ReadingCardDto(toCardDto(rc.getCard()), rc.isReversed()))
            .toList();
        return new ReadingResponse(
            reading.getId(),
            reading.getType(),
            reading.getQuestion(),
            cards,
            reading.getInterpretation(),
            reading.getCreatedAt(),
            reading.getOutcomeStatus(),
            reading.getOutcomeNote(),
            reading.getOutcomeRecordedAt()
        );
    }
}
