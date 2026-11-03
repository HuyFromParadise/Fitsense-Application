package com.example.fitsense.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI fitsenseOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("FitSense API")
                        .version("0.1.0")
                        .description("Source of truth for endpoints and DTOs: fitsense-documentation/openapi.yaml"))
                .components(new Components().addSecuritySchemes(
                        BEARER,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("Firebase ID token")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}
