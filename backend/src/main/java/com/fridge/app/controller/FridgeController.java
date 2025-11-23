package com.fridge.app.controller;

import com.fridge.app.dto.WordBankDto;
import com.fridge.app.entity.LearningProgress;
import com.fridge.app.repository.LearningProgressRepository;
import com.fridge.app.service.LearningProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map; // Import Map

@RestController
@RequestMapping("/api/fridge")
@RequiredArgsConstructor
public class FridgeController {

    private final LearningProgressService learningProgressService;
    private final LearningProgressRepository learningProgressRepository; // 간단하게 바로 주입

    @GetMapping("/items")
    public ResponseEntity<List<WordBankDto>> getMyFridge() {
        return ResponseEntity.ok(learningProgressService.getMyFridgeItems());
    }

    // ✨ [New] 복습 완료 API
    @PostMapping("/review/{wordId}")
    public ResponseEntity<?> reviewWord(@PathVariable Long wordId) {
        // 1. 해당 단어의 진도 데이터를 찾음
        // (실무에선 Service로 빼는 게 좋지만, 지금은 빠르게 Controller에서 처리)
        LearningProgress progress = learningProgressRepository.findAll().stream()
                .filter(p -> p.getWord().getWordId().equals(wordId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Word not found"));

        // 2. 상태 업데이트 (싱싱하게 만들기)
        progress.setReviewCount(progress.getReviewCount() + 1);
        progress.setProficiencyLevel(Math.min(progress.getProficiencyLevel() + 1, 5)); // 최대 레벨 5
        progress.setLastReviewedAt(LocalDateTime.now()); // 방금 공부함!
        
        // 3. 저장
        learningProgressRepository.save(progress);

        return ResponseEntity.ok().body(Map.of("message", "Reviewed successfully!"));
    }
}