package com.fridge.app.dto;

import com.fridge.app.entity.LearningProgress;
import com.fridge.app.entity.Translation;
import lombok.Getter;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;

@Getter
public class WordBankDto {
    private final Long wordId;
    private final String labelEn;
    private final int proficiencyLevel;
    
    // ✨ [New] 신선도 상태 (FRESH, WARNING, ROTTEN)
    private final String freshness; 
    private final long daysSinceReview;

    // 상세 정보
    private final String nativeDefinition;
    private final String languageCode;
    private final String translatedWord;
    private final String exampleSentence;
    private final String emoji;
    private final String imagePath;

    public WordBankDto(LearningProgress progress) {
        this.wordId = progress.getWord().getWordId();
        this.labelEn = progress.getWord().getLabelEn();
        this.proficiencyLevel = progress.getProficiencyLevel();
        
        // ✨ [New] 모국어 뜻 가져오기
        this.nativeDefinition = progress.getWord().getNameKo();

        // ✨ [Logic] 신선도 계산 (마지막 복습일로부터 며칠 지났나?)
        LocalDateTime lastReview = progress.getLastReviewedAt();
        this.daysSinceReview = ChronoUnit.DAYS.between(lastReview, LocalDateTime.now());

        if (daysSinceReview < 2) {
            this.freshness = "FRESH";
        } else if (daysSinceReview < 4) {
            this.freshness = "WARNING";
        } else {
            this.freshness = "ROTTEN"; // 4일 지나면 썩음!
        }

        // 번역 정보 매핑 (기존과 동일)
        Translation t = progress.getWord().getTranslations().stream()
                .max(Comparator.comparing(Translation::getCreatedAt))
                .orElse(null);

        if (t != null) {
            this.languageCode = t.getLanguageCode();
            this.translatedWord = t.getTranslatedWord();
            this.exampleSentence = t.getExampleSentence();
            this.emoji = (t.getEmoji() != null) ? t.getEmoji() : "📦";
        } else {
            this.languageCode = "en";
            this.translatedWord = "???";
            this.exampleSentence = "No data.";
            this.emoji = "📦";
        }
        this.imagePath = progress.getWord().getImagePath();
    }
}