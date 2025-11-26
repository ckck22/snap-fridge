package com.fridge.app.service;

import com.fridge.app.dto.QuizOptionsDto;
import com.fridge.app.dto.WordBankDto;
import com.fridge.app.entity.LearningProgress;
import com.fridge.app.entity.Word;
import com.fridge.app.repository.LearningProgressRepository;
import com.fridge.app.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningProgressService {

    private final LearningProgressRepository learningProgressRepository;
    private final WordRepository wordRepository; // ✨ 퀴즈 오답 생성을 위해 필요

    /**
     * 1. Get My Fridge Items (Sorted by Freshness)
     * Uses 'findAllWithDetails' to prevent N+1 query issues.
     * Sorts items so that 'Rotten' (oldest review date) items appear first.
     */
    @Transactional(readOnly = true)
    public List<WordBankDto> getMyFridgeItems() {
        return learningProgressRepository.findAllWithDetails().stream()
                // Sort by last reviewed date (Oldest first -> Rotten items at the top)
                .sorted(Comparator.comparing(LearningProgress::getLastReviewedAt))
                .map(WordBankDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 2. Generate Survival Quiz (Multiple Choice)
     * Creates a quiz for a specific word to restore its freshness.
     * - 1 Correct Answer
     * - 3 Wrong Answers (Distractors) from the DB
     */
    public QuizOptionsDto generateSurvivalQuiz(Long progressId) {
        LearningProgress target = learningProgressRepository.findById(progressId)
                .orElseThrow(() -> new RuntimeException("Progress not found"));
        
        Word correctWord = target.getWord();
        String question = correctWord.getLabelEn(); // Q: Apple
        
        // Use the native definition (e.g., "사과") as the answer. 
        // If null, fallback to labelEn (though it should have a definition by now).
        String answer = (correctWord.getNameKo() != null) ? correctWord.getNameKo() : correctWord.getLabelEn();

        // 1. Fetch 3 random distractors (excluding the correct word)
        List<Word> distractors = wordRepository.findRandomWords(correctWord.getWordId(), 3);
        
        // 2. Build the options list
        List<QuizOptionsDto.Option> options = new ArrayList<>();
        
        // Add correct answer
        options.add(new QuizOptionsDto.Option(correctWord.getWordId(), answer)); 
        
        // Add wrong answers
        for (Word w : distractors) {
            String distractorText = (w.getNameKo() != null) ? w.getNameKo() : w.getLabelEn();
            options.add(new QuizOptionsDto.Option(w.getWordId(), distractorText));
        }

        // 3. Shuffle options so the correct answer isn't always first
        Collections.shuffle(options);

        // Return the quiz object
        return new QuizOptionsDto(correctWord.getWordId(), question, options);
    }

    /**
     * Helper: Generate quiz by Word ID (Used by Frontend convenience)
     */
    public QuizOptionsDto generateSurvivalQuizByWord(Long wordId) {
        LearningProgress lp = learningProgressRepository.findAll().stream()
            .filter(p -> p.getWord().getWordId().equals(wordId))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Learning Progress not found for wordId: " + wordId));
        
        return generateSurvivalQuiz(lp.getProgressId());
    }
}