package com.fridge.app.dto;

import com.fridge.app.entity.Translation;
import lombok.Getter;

@Getter
public class TranslationDto {

    private final String languageCode;
    private final String translatedWord;
    private final String exampleSentence;

    public TranslationDto(Translation entity) {
        this.languageCode = entity.getLanguageCode();
        this.translatedWord = entity.getTranslatedWord();
        
        this.exampleSentence = entity.getExampleSentence();
    }
}