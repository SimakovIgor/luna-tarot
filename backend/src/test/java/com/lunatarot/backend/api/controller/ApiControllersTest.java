package com.lunatarot.backend.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.TestConfig;
import com.lunatarot.backend.service.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("it")
@Import(TestConfig.class)
class ApiControllersTest {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(System.nanoTime());

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper json = new ObjectMapper();

    private static long nextTgUserId() {
        return USER_ID_SEED.incrementAndGet();
    }

    @Test
    void requests_without_bearer_token_return_401() {
        ResponseEntity<String> resp = rest.getForEntity(url("/api/me"), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void requests_with_invalid_token_return_401() {
        ResponseEntity<String> resp = rest.exchange(url("/api/me"), HttpMethod.GET,
            new HttpEntity<>(bearer("garbage.token")), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void me_endpoint_returns_user_profile_with_valid_token() throws Exception {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(nextTgUserId())
            .name("Алиса")
            .birthDate(LocalDate.of(1995, 3, 15))
            .zodiac(ZodiacSign.PISCES)
            .lifePathNumber((short) 33)
            .conversationState(BotConversationState.READY)
            .build());

        ResponseEntity<String> resp = rest.exchange(url("/api/me"), HttpMethod.GET,
            new HttpEntity<>(bearerForUser(user.getTgUserId())), String.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = json.readTree(resp.getBody());
        assertThat(body.get("name").asText()).isEqualTo("Алиса");
        assertThat(body.get("zodiac").asText()).isEqualTo("PISCES");
        assertThat(body.get("lifePathNumber").asInt()).isEqualTo(33);
    }

    @Test
    void three_card_endpoint_returns_reading_with_three_cards() throws Exception {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(nextTgUserId()).name("Тест").conversationState(BotConversationState.READY).build());

        HttpHeaders h = bearerForUser(user.getTgUserId());
        h.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> req = new HttpEntity<>("{\"question\":\"Что меня ждёт?\"}", h);

        ResponseEntity<String> resp = rest.postForEntity(url("/api/reading/3card"), req, String.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = json.readTree(resp.getBody());
        assertThat(body.get("type").asText()).isEqualTo("THREE_CARD");
        assertThat(body.get("cards")).hasSize(3);
        assertThat(body.get("interpretation").asText()).isNotBlank();
    }

    @Test
    void card_of_day_is_idempotent_per_day() throws Exception {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(nextTgUserId()).name("Test").conversationState(BotConversationState.READY).build());

        HttpHeaders h = bearerForUser(user.getTgUserId());
        var resp1 = rest.exchange(url("/api/reading/card-of-day"), HttpMethod.GET, new HttpEntity<>(h), String.class);
        var resp2 = rest.exchange(url("/api/reading/card-of-day"), HttpMethod.GET, new HttpEntity<>(h), String.class);

        assertThat(resp1.getStatusCode()).isEqualTo(HttpStatus.OK);
        long id1 = json.readTree(resp1.getBody()).get("id").asLong();
        long id2 = json.readTree(resp2.getBody()).get("id").asLong();
        assertThat(id2).isEqualTo(id1);
    }

    @Test
    void history_is_empty_initially_and_lists_after_reading() throws Exception {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(nextTgUserId()).name("X").conversationState(BotConversationState.READY).build());
        HttpHeaders h = bearerForUser(user.getTgUserId());

        var before = rest.exchange(url("/api/history"), HttpMethod.GET, new HttpEntity<>(h), String.class);
        assertThat(json.readTree(before.getBody()).size()).isEqualTo(0);

        HttpHeaders post = bearerForUser(user.getTgUserId());
        post.setContentType(MediaType.APPLICATION_JSON);
        rest.postForEntity(url("/api/reading/3card"),
            new HttpEntity<>("{\"question\":\"тестовый вопрос\"}", post), String.class);

        var after = rest.exchange(url("/api/history"), HttpMethod.GET, new HttpEntity<>(h), String.class);
        assertThat(json.readTree(after.getBody()).size()).isEqualTo(1);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        return h;
    }

    private HttpHeaders bearerForUser(long tgUserId) {
        return bearer(authService.issue(tgUserId).token());
    }
}
