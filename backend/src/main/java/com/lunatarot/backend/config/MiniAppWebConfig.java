package com.lunatarot.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Отдаёт Mini App SPA по {@code /app/**} из {@code classpath:/static/app/}.
 *
 * Vite собирает фронт в {@code backend/src/main/resources/static/app/} → попадает в JAR.
 *
 * Кэширование разделено на три handler-а в порядке специфичности:
 *  1) hashed assets (index-*.js, index-*.css) — immutable на год (имя меняется при rebuild)
 *  2) картинки/прочее — 1 час
 *  3) catch-all включая index.html — no-store (Telegram WebView не должен залипать
 *     на старой версии после rebuild backend)
 *
 * REST (/api/**) и actuator не затронуты — у них свои контроллеры.
 */
@Configuration
public class MiniAppWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1) Vite hashed assets — immutable на год (имена с hash).
        registry.addResourceHandler("/app/assets/**")
            .addResourceLocations("classpath:/static/app/assets/")
            .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).immutable());

        // 2) Картинки карт и прочие статичные ресурсы — 1 час.
        registry.addResourceHandler("/app/cards/**")
            .addResourceLocations("classpath:/static/app/cards/")
            .setCacheControl(CacheControl.maxAge(1, TimeUnit.HOURS));

        // 3) Catch-all: index.html, fallback для SPA-роутинга и прочее — no-store.
        //    Telegram WebView получает свежий HTML при каждом открытии Mini App.
        registry.addResourceHandler("/app/**")
            .addResourceLocations("classpath:/static/app/")
            .setCacheControl(CacheControl.noStore())
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    if (!resourcePath.isEmpty() && !resourcePath.endsWith("/")) {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                    }
                    return new ClassPathResource("static/app/index.html");
                }
            });
    }
}
