package com.fridge.app.controller;

import com.fridge.app.dto.QuizQuestionDto;
import com.fridge.app.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @PostMapping("/quiz/generate")
    public ResponseEntity<?> generateQuiz(
            @RequestParam("image") MultipartFile imageFile,
            @RequestParam(value = "targetLang", defaultValue = "es") String targetLang,
            // ✨ [NEW] Added nativeLang parameter
            @RequestParam(value = "nativeLang", defaultValue = "ko") String nativeLang) {

        if (imageFile.isEmpty()) {
            return ResponseEntity.badRequest().body("Image file is empty.");
        }

        try {
            System.out.println("📷 Received image. Target: " + targetLang + ", Native: " + nativeLang);

            // ✨ [FIX] Pass all 3 arguments to the service
            List<QuizQuestionDto> quiz = quizService.generateQuizFromImage(imageFile, targetLang, nativeLang);

            return ResponseEntity.ok(quiz);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing image: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred: " + e.getMessage());
        }
    }
}