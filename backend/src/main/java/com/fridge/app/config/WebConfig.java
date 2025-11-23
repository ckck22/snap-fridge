package com.fridge.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 현재 프로젝트 루트 경로의 'uploads' 폴더 절대 경로 가져오기
        Path uploadDir = Paths.get("uploads");
        String uploadPath = uploadDir.toFile().getAbsolutePath();

        // ⚠️ 중요: Mac/Linux에서는 file: 접두사가 필수입니다.
        // 끝에 슬래시(/)도 붙여줘야 합니다.
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:" + uploadPath + "/");
                
        System.out.println("📂 Serving images from: file:" + uploadPath + "/");
    }
}