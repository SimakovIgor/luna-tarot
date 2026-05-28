package com.lunatarot.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan({"com.lunatarot.backend.config", "com.lunatarot.backend.admin"})
@EnableScheduling
public class LunaTarotBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(LunaTarotBackendApplication.class, args);
    }

}
