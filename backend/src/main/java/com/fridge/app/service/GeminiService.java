package com.fridge.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fridge.app.dto.gemini.GeminiRequest;
import com.fridge.app.dto.gemini.GeminiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final ObjectMapper objectMapper;

    /**
     * 1. Semantic Filtering (Smart Labeling)
     * Picks the best food name from Vision API labels.
     * ✨ UPDATED: Now instructs AI to avoid botanical names (e.g., Cruciferous) 
     * and prefer common grocery names (e.g., Cabbage).
     */
    public String extractFoodLabel(List<String> visionLabels) {
        String labelsString = String.join(", ", visionLabels);
        
        String promptText = String.format(
            "Analyze this list of image labels from Google Vision: [%s].\n" +
            "Your Goal: Identify the single most specific 'Common Grocery Store Item Name'.\n" +
            "\n" +
            "RULES:\n" +
            "1. Ignore generic terms like 'Food', 'Produce', 'Vegetable', 'Ingredient', 'Dish', 'Recipe'.\n" +
            "2. 🚫 STRICTLY AVOID botanical families or scientific categories.\n" +
            "   - Example: Do NOT use 'Cruciferous vegetables', use 'Cabbage' or 'Broccoli'.\n" +
            "   - Example: Do NOT use 'Citrus', use 'Lemon' or 'Orange'.\n" +
            "   - Example: Do NOT use 'Nightshade', use 'Tomato'.\n" +
            "3. If multiple specific items are listed, pick the most prominent one.\n" +
            "4. If no food is found, return null.\n" +
            "\n" +
            "Return ONLY a JSON object: { \"foodLabel\": \"Name\" } or { \"foodLabel\": null }.", 
            labelsString
        );

        JsonNode response = callGemini(promptText);
        
        if (response != null && response.has("foodLabel") && !response.get("foodLabel").isNull()) {
            return response.get("foodLabel").asText();
        }
        return null;
    }

    /**
     * 2. Content Generation (Translation, Definition, Contextual Sentence)
     * Uses user's native language and context items to create rich content.
     */
    public JsonNode getTranslationAndSentence(String word, String targetLang, String nativeLang, List<String> contextWords) {
        
        String contextString = (contextWords == null || contextWords.isEmpty()) 
            ? "None" 
            : String.join(", ", contextWords);

        String promptText = String.format(
            "You are a professional language teacher.\n" +
            "User's Native Language: %s\n" +
            "Target Language to Learn: %s\n" +
            "Word to analyze: '%s'\n" +
            "Context (User's Fridge): [%s]\n" +
            "\n" +
            "Task: Provide the following in JSON format:\n" +
            "1. translatedWord: The word translated into the Target Language. (If Target is same as Word, keep it).\n" +
            "2. nativeDefinition: The meaning of the word in the User's Native Language (%s).\n" +
            "3. exampleSentence: A simple A1-level sentence in the Target Language (%s).\n" +
            "   - Try to combine with context items ([%s]) if natural.\n" +
            "   - MUST NOT be empty.\n" +
            "4. emoji: A single representative emoji.\n" +
            "\n" +
            "STRICT JSON OUTPUT: { \"translatedWord\": \"...\", \"nativeDefinition\": \"...\", \"exampleSentence\": \"...\", \"emoji\": \"...\" }", 
            nativeLang, targetLang, word, contextString, 
            nativeLang, targetLang, contextString
        );

        return callGemini(promptText);
    }

    /**
     * Shared method to call Gemini API and parse JSON response safely.
     */
    private JsonNode callGemini(String promptText) {
        GeminiRequest requestBody = new GeminiRequest(
            List.of(new GeminiRequest.Content(
                List.of(new GeminiRequest.Part(promptText))
            ))
        );

        RestClient restClient = RestClient.create();
        
        try {
            GeminiResponse response = restClient.post()
                    .uri(apiUrl + "?key=" + apiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response != null && !response.getCandidates().isEmpty()) {
                String jsonString = response.getCandidates().get(0).getContent().getParts().get(0).getText();
                
                // Debug Log
                System.out.println("🤖 Raw Gemini Response: " + jsonString);

                // Clean up markdown code blocks (e.g., ```json ... ```)
                jsonString = jsonString.replaceAll("```json", "").replaceAll("```", "").trim();
                
                JsonNode rootNode = objectMapper.readTree(jsonString);

                // Safety Check: Ensure exampleSentence is not empty or missing
                if (rootNode instanceof ObjectNode) {
                    ObjectNode objNode = (ObjectNode) rootNode;
                    if (!objNode.has("exampleSentence") || objNode.get("exampleSentence").asText().isEmpty()) {
                        // Fallback strategy: check for other common keys
                         String fallback = "No example available.";
                         if (objNode.has("sentence")) fallback = objNode.get("sentence").asText();
                         objNode.put("exampleSentence", fallback);
                    }
                }
                return rootNode;
            }
        } catch (Exception e) {
            System.err.println("🚨 Gemini Error: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
}