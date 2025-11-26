package com.fridge.app.controller;

import com.fridge.app.dto.UserStatsDto;
import com.fridge.app.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @GetMapping
    public ResponseEntity<UserStatsDto> getStats() {
        return ResponseEntity.ok(statsService.getUserStats());
    }
}