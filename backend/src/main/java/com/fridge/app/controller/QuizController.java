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

// @RestController: Indicates that this class handles REST API requests and returns JSON.
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor // Automatically injects the final QuizService.
public class QuizController {

    private final QuizService quizService;

    /**
     * Endpoint to generate a quiz from an uploaded image.
     * * @param imageFile  The photo taken by the user.
     * @param targetLang The language code the user wants to learn (e.g., "es", "fr", "de").
     * Defaults to "es" (Spanish) if not provided.
     */
    @PostMapping("/quiz/generate")
    public ResponseEntity<?> generateQuiz(
            @RequestParam("image") MultipartFile imageFile,
            @RequestParam(value = "targetLang", defaultValue = "es") String targetLang) {

        // 1. Basic validation: Check if the file is empty.
        if (imageFile.isEmpty()) {
            return ResponseEntity.badRequest().body("Image file is empty.");
        }

        try {
            System.out.println("📷 Received image. Target Language: " + targetLang);

            // 2. Call the Service to process the image and get quiz data.
            // We pass the 'targetLang' so the service knows what language to ask Gemini for.
            List<QuizQuestionDto> quiz = quizService.generateQuizFromImage(imageFile, targetLang);

            // 3. Return the list of quiz questions with a 200 OK status.
            return ResponseEntity.ok(quiz);

        } catch (IOException e) {
            // Handle IO errors (e.g., file processing issues).
            e.printStackTrace();
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing image: " + e.getMessage());
        } catch (Exception e) {
            // Handle any other unexpected errors.
            e.printStackTrace();
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred: " + e.getMessage());
        }
    }
}