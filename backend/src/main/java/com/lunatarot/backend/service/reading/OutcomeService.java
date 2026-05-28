package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.enums.ReadingOutcome;
import com.lunatarot.backend.domain.repository.ReadingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.NoSuchElementException;

/**
 * «Как сбылось»: пользователь возвращается к раскладу и отмечает, попала ли Луна.
 * Любой расклад (включая карту дня) можно пометить. Перезапись разрешена — мнение меняется.
 */
@Service
public class OutcomeService {

    private static final int MAX_NOTE_LEN = 1000;

    private final ReadingRepository readingRepository;
    private final Clock clock;

    public OutcomeService(ReadingRepository readingRepository, Clock clock) {
        this.readingRepository = readingRepository;
        this.clock = clock;
    }

    @Transactional
    public ReadingEntity recordOutcome(long tgUserId, long readingId, ReadingOutcome status, String note) {
        ReadingEntity reading = loadOwned(tgUserId, readingId);
        reading.setOutcomeStatus(status);
        reading.setOutcomeNote(normalizeNote(note));
        reading.setOutcomeRecordedAt(clock.instant());
        return readingRepository.saveAndFlush(reading);
    }

    @Transactional
    public ReadingEntity clearOutcome(long tgUserId, long readingId) {
        ReadingEntity reading = loadOwned(tgUserId, readingId);
        reading.setOutcomeStatus(null);
        reading.setOutcomeNote(null);
        reading.setOutcomeRecordedAt(null);
        return readingRepository.saveAndFlush(reading);
    }

    private ReadingEntity loadOwned(long tgUserId, long readingId) {
        ReadingEntity reading = readingRepository.findByIdWithCards(readingId)
            .orElseThrow(() -> new NoSuchElementException("Reading " + readingId + " not found"));
        if (reading.getUser() == null || reading.getUser().getTgUserId() != tgUserId) {
            // 404 наружу безопаснее, чем 403: чужой расклад просто «не существует» для тебя.
            throw new NoSuchElementException("Reading " + readingId + " not found");
        }
        return reading;
    }

    private static String normalizeNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.strip();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_NOTE_LEN ? trimmed.substring(0, MAX_NOTE_LEN) : trimmed;
    }
}
