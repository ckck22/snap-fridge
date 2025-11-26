package com.fridge.app.service;

import com.fridge.app.dto.UserStatsDto;
import com.fridge.app.dto.WordBankDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final LearningProgressService learningProgressService;

    public UserStatsDto getUserStats() {
        // 1. 전체 아이템 가져오기 (기존 로직 재활용)
        List<WordBankDto> items = learningProgressService.getMyFridgeItems();

        // 2. XP 계산
        int totalXp = items.size() * 50 + items.stream().mapToInt(i -> i.getProficiencyLevel() * 20).sum();

        // 3. 레벨/타이틀 계산 로직
        String currentTitle = "🥚 Dorm Student";
        String nextTitle = "🍳 Home Cook";
        int nextLevelXp = 200;

        if (totalXp >= 1000) {
            currentTitle = "👨‍🍳 Master Chef";
            nextTitle = "👑 Legend";
            nextLevelXp = 5000; // Max Level
        } else if (totalXp >= 200) {
            currentTitle = "🍳 Home Cook";
            nextTitle = "👨‍🍳 Master Chef";
            nextLevelXp = 1000;
        }

        // 4. 진행률 계산 (0.0 ~ 1.0)
        double progress = (double) totalXp / nextLevelXp;
        if (progress > 1.0) progress = 1.0;

        // 5. 신선도 통계
        int freshCount = (int) items.stream().filter(i -> i.getFreshness().equals("FRESH")).count();
        int rottenCount = (int) items.stream().filter(i -> i.getFreshness().equals("ROTTEN")).count();

        return UserStatsDto.builder()
                .currentTitle(currentTitle)
                .nextTitle(nextTitle)
                .totalXp(totalXp)
                .nextLevelXp(nextLevelXp)
                .progressPercentage(progress)
                .totalItems(items.size())
                .freshCount(freshCount)
                .rottenCount(rottenCount)
                .build();
    }
}