package com.lunatarot.backend.api.dto;

import java.util.List;

public record TarotCardDto(
    long id,
    int numeral,
    String nameRu,
    String nameEn,
    List<String> keywords,
    String uprightMeaning,
    String reversedMeaning,
    String imagePath
) {
}
