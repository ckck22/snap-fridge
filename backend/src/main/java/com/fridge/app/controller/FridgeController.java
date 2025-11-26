package com.fridge.app.controller;

import com.fridge.app.dto.QuizOptionsDto;
import com.fridge.app.dto.WordBankDto;
import com.fridge.app.service.LearningProgressService;
import com.fridge.app.entity.LearningProgress; // Import
import com.fridge.app.repository.LearningProgressRepository; // Import
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fridge")
@RequiredArgsConstructor
public class FridgeController {

    private final LearningProgressService learningProgressService;
    private final LearningProgressRepository learningProgressRepository;

    // 1. 내 냉장고 목록 조회
    @GetMapping("/items")
    public ResponseEntity<List<WordBankDto>> getMyFridge() {
        return ResponseEntity.ok(learningProgressService.getMyFridgeItems());
    }

    // 2. 복습 완료 처리 (I Memorized This)
    @PostMapping("/review/{wordId}")
    public ResponseEntity<?> reviewWord(@PathVariable Long wordId) {
        LearningProgress progress = learningProgressRepository.findAll().stream()
                .filter(p -> p.getWord().getWordId().equals(wordId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Word not found"));

        progress.setReviewCount(progress.getReviewCount() + 1);
        progress.setProficiencyLevel(Math.min(progress.getProficiencyLevel() + 1, 5));
        progress.setLastReviewedAt(LocalDateTime.now());
        
        learningProgressRepository.save(progress);

        return ResponseEntity.ok().body(Map.of("message", "Reviewed successfully!"));
    }

    // ✨✨✨ [이게 없어서 에러가 난 겁니다!] ✨✨✨
    // 3. 퀴즈 데이터 요청 (Survival Quiz)
    @GetMapping("/quiz-by-word/{wordId}")
    public ResponseEntity<QuizOptionsDto> getSurvivalQuizByWord(@PathVariable Long wordId) {
        // 서비스에게 퀴즈 만들어오라고 시킴
        return ResponseEntity.ok(learningProgressService.generateSurvivalQuizByWord(wordId));
    }
}