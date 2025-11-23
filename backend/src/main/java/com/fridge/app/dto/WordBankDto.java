package com.fridge.app.dto;

import com.fridge.app.entity.LearningProgress;
import com.fridge.app.entity.Translation;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.Comparator;

@Getter
public class WordBankDto {
    private final Long wordId;
    private final String labelEn;
    private final int proficiencyLevel;
    private final boolean needsReview;
    
    // ✨ [추가] 모국어 뜻 (예: 사과)
    private final String nativeDefinition; 

    private final String languageCode;
    private final String translatedWord;
    private final String exampleSentence;
    private final String emoji;

    public WordBankDto(LearningProgress progress) {
        this.wordId = progress.getWord().getWordId();
        this.labelEn = progress.getWord().getLabelEn();
        this.proficiencyLevel = progress.getProficiencyLevel();
        this.needsReview = progress.getNextReviewDate().isBefore(LocalDateTime.now());
        
        // ✨ [매핑] Word 엔티티에 저장된 nameKo(모국어 뜻)를 가져옵니다.
        this.nativeDefinition = progress.getWord().getNameKo(); 

        Translation t = progress.getWord().getTranslations().stream()
                .max(Comparator.comparing(Translation::getCreatedAt))
                .orElse(null);

        if (t != null) {
            this.languageCode = t.getLanguageCode();
            this.translatedWord = t.getTranslatedWord();
            this.exampleSentence = t.getExampleSentence();
            this.emoji = (t.getEmoji() != null && !t.getEmoji().isEmpty()) ? t.getEmoji() : "📦";
        } else {
            this.languageCode = "en";
            this.translatedWord = "???";
            this.exampleSentence = "No data yet.";
            this.emoji = "📦";
        }
    }
}