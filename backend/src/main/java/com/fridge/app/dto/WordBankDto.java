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
    
    private final String languageCode;
    private final String translatedWord;
    private final String exampleSentence;
    private final String emoji;
    private final String imagePath;

    public WordBankDto(LearningProgress progress) {
        this.wordId = progress.getWord().getWordId();
        this.labelEn = progress.getWord().getLabelEn();
        this.proficiencyLevel = progress.getProficiencyLevel();
        this.needsReview = progress.getNextReviewDate().isBefore(LocalDateTime.now());
        this.imagePath = progress.getWord().getImagePath();

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