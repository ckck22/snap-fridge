package com.fridge.app.service;

import com.fridge.app.dto.WordBankDto;
import com.fridge.app.repository.LearningProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningProgressService {

    private final LearningProgressRepository learningProgressRepository;

    @Transactional(readOnly = true)
    public List<WordBankDto> getMyFridgeItems() {
        return learningProgressRepository.findAll().stream()
                .map(WordBankDto::new) 
                .collect(Collectors.toList());
    }
}