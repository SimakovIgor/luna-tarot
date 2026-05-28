package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.repository.TarotCardRepository;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * Выдача карт.
 * - Расклад на вопрос: случайные карты без повторов + 50% шанс перевёрнутости каждой.
 * - Карта дня: детерминированная одна карта на (user, date), всегда upright (позитивности ради).
 */
@Service
public class CardDrawService {

    private static final double REVERSED_PROBABILITY = 0.5;

    private final TarotCardRepository tarotCardRepository;
    private final SecureRandom random = new SecureRandom();

    public CardDrawService(TarotCardRepository tarotCardRepository) {
        this.tarotCardRepository = tarotCardRepository;
    }

    @Transactional(readOnly = true)
    public List<DrawnCard> drawWithReversal(int count) {
        if (count < 1) {
            throw new IllegalArgumentException("count must be >= 1, got " + count);
        }
        List<TarotCardEntity> deck = new ArrayList<>(tarotCardRepository.findAll());
        if (deck.size() < count) {
            throw new IllegalStateException(
                "Tarot deck has " + deck.size() + " cards, requested " + count
            );
        }
        Collections.shuffle(deck, random);
        List<DrawnCard> result = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            result.add(new DrawnCard(deck.get(i), random.nextDouble() < REVERSED_PROBABILITY));
        }
        return List.copyOf(result);
    }

    // DMI_RANDOM_USED_ONLY_ONCE — намеренно: seeded Random для детерминированного выбора;
    // секурити-целей нет, PRNG нужен только для равномерного индекса.
    @SuppressFBWarnings("DMI_RANDOM_USED_ONLY_ONCE")
    @Transactional(readOnly = true)
    public DrawnCard drawCardOfDay(long userId, LocalDate date) {
        List<TarotCardEntity> deck = tarotCardRepository.findAll();
        if (deck.isEmpty()) {
            throw new IllegalStateException("Tarot deck is empty — Flyway seed missing");
        }
        long seed = mixSeed(userId, date.toEpochDay());
        int idx = Math.floorMod(new Random(seed).nextInt(), deck.size());
        return new DrawnCard(deck.get(idx), false);
    }

    private static long mixSeed(long userId, long epochDay) {
        long x = userId * 0x9E37_79B9_7F4A_7C15L + epochDay;
        x ^= x >>> 30;
        x *= 0xBF58_476D_1CE4_E5B9L;
        x ^= x >>> 27;
        x *= 0x94D0_49BB_1331_11EBL;
        x ^= x >>> 31;
        return x;
    }
}
