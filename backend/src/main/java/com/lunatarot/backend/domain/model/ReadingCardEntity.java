package com.lunatarot.backend.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "reading_cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingCardEntity {

    @EmbeddedId
    private ReadingCardId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("readingId")
    @JoinColumn(name = "reading_id")
    private ReadingEntity reading;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "card_id", nullable = false)
    private TarotCardEntity card;

    @Column(nullable = false)
    private boolean reversed;
}
