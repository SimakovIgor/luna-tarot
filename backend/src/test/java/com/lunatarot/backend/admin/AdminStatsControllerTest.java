package com.lunatarot.backend.admin;

import com.lunatarot.backend.it.TestConfig;
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

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("it")
@Import(TestConfig.class)
class AdminStatsControllerTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Test
    void returns_401_without_credentials() {
        ResponseEntity<String> resp = rest.getForEntity(url("/admin/api/stats"), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(resp.getHeaders().getFirst("WWW-Authenticate"))
            .startsWith("Basic realm=");
    }

    @Test
    void returns_401_with_wrong_password() {
        ResponseEntity<String> resp = rest.exchange(url("/admin/api/stats"),
            HttpMethod.GET, new HttpEntity<>(basic("admin", "nope")), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void returns_401_with_malformed_base64() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic !!!not-base64!!!");
        ResponseEntity<String> resp = rest.exchange(url("/admin/api/stats"),
            HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void returns_401_when_basic_payload_has_no_colon() {
        HttpHeaders headers = new HttpHeaders();
        String token = Base64.getEncoder().encodeToString("noColonHere".getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + token);
        ResponseEntity<String> resp = rest.exchange(url("/admin/api/stats"),
            HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void returns_json_stats_with_valid_credentials() {
        ResponseEntity<String> resp = rest.exchange(url("/admin/api/stats?days=7"),
            HttpMethod.GET, new HttpEntity<>(basic("admin", "admin-test-password")), String.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getHeaders().getContentType().includes(MediaType.APPLICATION_JSON)).isTrue();
        assertThat(resp.getBody()).contains("\"totals\"", "\"byDay\"", "\"readingsByType\"");
    }

    @Test
    void renders_dashboard_html_with_valid_credentials() {
        ResponseEntity<String> resp = rest.exchange(url("/admin/"),
            HttpMethod.GET, new HttpEntity<>(basic("admin", "admin-test-password")), String.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getHeaders().getContentType().toString()).startsWith("text/html");
        assertThat(resp.getBody())
            .contains("Luna · admin")
            .contains("По дням")
            .contains("Расклады по типу");
    }

    @Test
    void clamps_window_to_max_90_days() {
        ResponseEntity<String> resp = rest.exchange(url("/admin/?days=9999"),
            HttpMethod.GET, new HttpEntity<>(basic("admin", "admin-test-password")), String.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).contains("последние 90 дней");
    }

    @Test
    void non_admin_paths_pass_through_filter() {
        ResponseEntity<String> resp = rest.getForEntity(url("/actuator/health"), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private static HttpHeaders basic(String user, String pass) {
        HttpHeaders headers = new HttpHeaders();
        String token = Base64.getEncoder().encodeToString(
            (user + ":" + pass).getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + token);
        return headers;
    }
}
