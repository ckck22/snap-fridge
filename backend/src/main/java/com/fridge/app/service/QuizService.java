package com.fridge.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fridge.app.dto.QuizQuestionDto;
import com.fridge.app.entity.LearningProgress;
import com.fridge.app.entity.Translation;
import com.fridge.app.entity.Word;
import com.fridge.app.repository.LearningProgressRepository;
import com.fridge.app.repository.TranslationRepository;
import com.fridge.app.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final WordRepository wordRepository;
    private final TranslationRepository translationRepository;
    private final LearningProgressRepository learningProgressRepository;
    private final VisionService visionService;
    private final GeminiService geminiService;

    // 🚫 블랙리스트 강화 (색깔, 모양 등 추가)
private static final Set<String> IGNORED_LABELS = Set.of(
        "Food", "Fruit", "Produce", "Natural foods", "Ingredient", "Vegetable", 
        "Whole food", "Local food", "Vegan nutrition", "Superfood", "Dish", 
        "Cuisine", "Recipe", "Bush", "Seedless fruit", "Staple food", "Botanical", 
        "Plant", "Leaf vegetable", "Food group", "Nutrient",
        "Gadget", "Technology", "Electronic device", "Output device", 
        "Display device", "Computer monitor", "Multimedia", "Screen", 
        "Computer", "Peripheral", "Computer accessory", "Personal computer",
        "Flat panel display", "Engineering", "Plastic", 
        "Electric blue", "Font", "Logo", "Brand",
        "Red", "Green", "Blue", "Yellow", "Orange", "White", "Black", "Purple",
        "Circle", "Rectangle", "Colorfulness", "Close-up", "Macro photography"
    );

    @Transactional
    public List<QuizQuestionDto> generateQuizFromImage(MultipartFile file, String targetLang, String nativeLang)
            throws IOException {

        // 1. Vision API
        List<String> rawLabels = visionService.detectLabels(file);
        System.out.println("👁️ Raw Vision labels: " + rawLabels);

        // 2. Gemini에게 "이 중에서 진짜 음식 딱 하나만 골라줘" 라고 시킴 (Semantic Filtering)
        // (만약 Gemini가 실패하면, 블랙리스트 거르고 첫 번째 거 선택)
        String bestFoodLabel = geminiService.extractFoodLabel(rawLabels);

        // Gemini가 못 찾았을 경우를 대비한 Fallback 로직
        if (bestFoodLabel == null) {
            bestFoodLabel = rawLabels.stream()
                    .filter(label -> !IGNORED_LABELS.contains(label))
                    .findFirst()
                    .orElse(null);
        }

        if (bestFoodLabel == null) {
            System.out.println("🚫 No relevant food detected.");
            return Collections.emptyList();
        }

        System.out.println("🎯 Final Choice: " + bestFoodLabel);

        // 3. 딱 하나만 리스트에 담음 (여러 개 저장 방지!)
        List<String> finalLabelList = new ArrayList<>();
        finalLabelList.add(bestFoodLabel);

        return finalLabelList.stream()
                .map(label -> getOrCreateWordData(label, targetLang, nativeLang, file))
                .map(word -> new QuizQuestionDto(word, targetLang, nativeLang))
                .collect(Collectors.toList());
    }

    private Word getOrCreateWordData(String labelEn, String targetLang, String nativeLang, MultipartFile file) {
        Word word = wordRepository.findByLabelEn(labelEn)
                .orElseGet(() -> {
                    Word newWord = new Word();
                    newWord.setLabelEn(labelEn);
                    newWord.setNameKo(labelEn);

                    String savedImageName = saveImage(file);
                    if (savedImageName != null) {
                        newWord.setImagePath(savedImageName);
                    }

                    return wordRepository.save(newWord);
                });

        learningProgressRepository.findByWord(word)
                .orElseGet(() -> {
                    LearningProgress progress = LearningProgress.createInitialProgress(word);
                    return learningProgressRepository.save(progress);
                });

        boolean translationExists = word.getTranslations().stream()
                .anyMatch(t -> t.getLanguageCode().equalsIgnoreCase(targetLang));

        if (!translationExists) {
            System.out.println("🤖 Asking Gemini: " + labelEn + " -> " + targetLang + " (Native: " + nativeLang + ")");

            List<String> contextWords = wordRepository.findTop3RecentWords().stream()
                    .map(Word::getLabelEn)
                    .filter(w -> !w.equalsIgnoreCase(labelEn))
                    .collect(Collectors.toList());

            JsonNode aiResponse = geminiService.getTranslationAndSentence(labelEn, targetLang, nativeLang,
                    contextWords);

            if (aiResponse != null) {
                Translation newTrans = new Translation();
                newTrans.setWord(word);
                newTrans.setLanguageCode(targetLang);
                newTrans.setTranslatedWord(aiResponse.path("translatedWord").asText(labelEn));

                String sentence = aiResponse.path("exampleSentence").asText();
                if (sentence == null || sentence.trim().isEmpty())
                    sentence = "No example available.";
                newTrans.setExampleSentence(sentence);

                String emoji = aiResponse.path("emoji").asText();
                if (emoji == null || emoji.trim().isEmpty())
                    emoji = "📦";
                newTrans.setEmoji(emoji);

                translationRepository.save(newTrans);
                word.getTranslations().add(newTrans);

                String nativeDef = aiResponse.path("nativeDefinition").asText();
                if (nativeDef != null && !nativeDef.isEmpty()) {
                    word.setNameKo(nativeDef);
                    wordRepository.save(word);
                }
            }
        }

        return word;
    }

    private String saveImage(MultipartFile file) {
        if (file == null || file.isEmpty())
            return null;
        try {
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadDir.resolve(filename);
            file.transferTo(filePath);
            return filename;
        } catch (IOException e) {
            return null;
        }
    }
}