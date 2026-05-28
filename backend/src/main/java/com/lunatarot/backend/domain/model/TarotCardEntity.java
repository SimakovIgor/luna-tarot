package com.lunatarot.backend.domain.model;

import com.lunatarot.backend.domain.model.enums.Arcana;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "tarot_cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TarotCardEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Arcana arcana;

    @Column(nullable = false)
    private Short numeral;

    @Column(name = "name_ru", nullable = false, length = 64)
    private String nameRu;

    @Column(name = "name_en", nullable = false, length = 64)
    private String nameEn;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> keywords;

    @Column(name = "upright_meaning", nullable = false, columnDefinition = "text")
    private String uprightMeaning;

    @Column(name = "reversed_meaning", columnDefinition = "text")
    private String reversedMeaning;

    @Column(name = "image_path", length = 255)
    private String imagePath;
}
