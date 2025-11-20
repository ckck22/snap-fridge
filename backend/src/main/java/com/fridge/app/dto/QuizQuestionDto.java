package com.fridge.app.dto;

import com.fridge.app.entity.Word;
import lombok.Getter;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class QuizQuestionDto {
    
    private final String labelEn;
    private final String nameKo;
    private final List<TranslationDto> translations;

    public QuizQuestionDto(Word entity) {
        this.labelEn = entity.getLabelEn();
        this.nameKo = entity.getNameKo();
        this.translations = entity.getTranslations().stream()
                .map(TranslationDto::new)
                .collect(Collectors.toList());
    }

    public QuizQuestionDto(Word entity, String targetLang) {
        this.labelEn = entity.getLabelEn();
        this.nameKo = entity.getNameKo();
        this.translations = entity.getTranslations().stream()
                .filter(t -> t.getLanguageCode().equalsIgnoreCase(targetLang))
                .map(TranslationDto::new)
                .collect(Collectors.toList());
    }
}