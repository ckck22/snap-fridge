package com.fridge.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fridge.app.dto.QuizQuestionDto;
import com.fridge.app.entity.Translation;
import com.fridge.app.entity.Word;
import com.fridge.app.repository.TranslationRepository;
import com.fridge.app.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final WordRepository wordRepository;
    private final TranslationRepository translationRepository;
    private final VisionService visionService;
    private final GeminiService geminiService;

    private static final Set<String> IGNORED_LABELS = Set.of(
            "Food", "Fruit", "Produce", "Natural foods", "Ingredient", "Vegetable",
            "Whole food", "Local food", "Vegan nutrition", "Superfood", "Dish",
            "Cuisine", "Recipe", "Bush", "Seedless fruit", "Staple food");

    @Transactional
    public List<QuizQuestionDto> generateQuizFromImage(MultipartFile file, String targetLang) throws IOException {
        List<String> labels = visionService.detectLabels(file);

        System.out.println("👁️ Raw Vision detected: " + labels);

        return labels.stream()
                .filter(label -> !IGNORED_LABELS.contains(label))
                .limit(3)
                .map(label -> getOrCreateWordData(label, targetLang))
                .map(word -> new QuizQuestionDto(word, targetLang))
                .collect(Collectors.toList());
    }

    private Word getOrCreateWordData(String labelEn, String targetLang) {
        Word word = wordRepository.findByLabelEn(labelEn)
                .orElseGet(() -> {
                    Word newWord = new Word();
                    newWord.setLabelEn(labelEn);
                    newWord.setNameKo(labelEn);
                    return wordRepository.save(newWord);
                });

        boolean translationExists = word.getTranslations().stream()
                .anyMatch(t -> t.getLanguageCode().equalsIgnoreCase(targetLang));

        if (!translationExists) {
            System.out.println("🤖 DB miss! Asking Gemini for: " + labelEn + " -> " + targetLang);

            JsonNode aiResponse = geminiService.getTranslationAndSentence(labelEn, targetLang);

            if (aiResponse != null) {
                Translation newTrans = new Translation();
                newTrans.setWord(word);
                newTrans.setLanguageCode(targetLang);
                newTrans.setTranslatedWord(aiResponse.path("translatedWord").asText(labelEn));

                String sentence = aiResponse.path("exampleSentence").asText();
                if (sentence == null || sentence.trim().isEmpty()) {
                    sentence = "Example sentence coming soon!";
                }
                newTrans.setExampleSentence(sentence);

                translationRepository.save(newTrans);
                word.getTranslations().add(newTrans);
            }
        }
        return word;
    }
}