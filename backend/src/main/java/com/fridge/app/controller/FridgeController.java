package com.fridge.app.controller;

import com.fridge.app.dto.WordBankDto;
import com.fridge.app.service.LearningProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/fridge")
@RequiredArgsConstructor
public class FridgeController {

    private final LearningProgressService learningProgressService;

    @GetMapping("/items")
    public ResponseEntity<List<WordBankDto>> getMyFridge() {
        List<WordBankDto> items = learningProgressService.getMyFridgeItems();
        return ResponseEntity.ok(items);
    }
}