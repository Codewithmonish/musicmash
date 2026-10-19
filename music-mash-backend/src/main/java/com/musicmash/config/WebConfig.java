package com.musicmash.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Static content:
 * <ul>
 *   <li>/uploads/&lt;file&gt;: uploaded media (the references FileStorageService returns), so judges
 *       and players can listen to performances. File names are random UUIDs; the path is permitted
 *       without login in SecurityConfig because an audio element cannot send a JWT.</li>
 *   <li>Everything else: the built React app (scripts/build_app.ps1 copies music-mash-frontend/dist
 *       into classpath:/static). A path that is not a file, e.g. /dashboard or /ai-analysis/6, gets
 *       index.html so React Router can handle it. /api/** never falls back: an unknown API path
 *       stays a 404 instead of returning the app.</li>
 * </ul>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(uploadDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);

        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new SpaFallbackResolver());
    }

    /** Serves the requested file if it exists, otherwise index.html (unless the path is an API call). */
    static class SpaFallbackResolver extends PathResourceResolver {
        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource requested = location.createRelative(resourcePath);
            if (requested.exists() && requested.isReadable()) {
                return requested;
            }
            if (resourcePath.startsWith("api/") || resourcePath.startsWith("uploads/")) {
                return null;
            }
            Resource index = new ClassPathResource("/static/index.html");
            return index.exists() ? index : null;   // no built frontend (dev mode): plain 404
        }
    }
}
