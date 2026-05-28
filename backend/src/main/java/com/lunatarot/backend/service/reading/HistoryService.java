package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.repository.ReadingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HistoryService {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 50;

    private final ReadingRepository readingRepository;

    public HistoryService(ReadingRepository readingRepository) {
        this.readingRepository = readingRepository;
    }

    @Transactional(readOnly = true)
    public List<ReadingEntity> recentForUser(Long userId, Integer limit) {
        int effective = limit == null ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);
        return readingRepository.findRecentByUserId(userId, PageRequest.of(0, effective));
    }
}
