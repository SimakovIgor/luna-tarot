package com.lunatarot.backend.domain.model.enums;

/**
 * Биологический пол / гендер пользователя — нужен только для грамматического
 * согласования родов в текстах Luna ("рад знакомству" / "рада знакомству",
 * "родился" / "родилась"). UNSPECIFIED → используем нейтральные формулировки.
 */
public enum Gender {
    MALE,
    FEMALE,
    UNSPECIFIED
}
