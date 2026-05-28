package com.lunatarot.backend.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ReadingCardId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "reading_id")
    private Long readingId;

    private Short position;
}
