package com.fridge.app.repository;

import com.fridge.app.entity.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WordRepository extends JpaRepository<Word, Long> {
    
    Optional<Word> findByLabelEn(String labelEn);

    @Query(value = "SELECT * FROM word ORDER BY created_at DESC LIMIT 3", nativeQuery = true)
    List<Word> findTop3RecentWords();
}