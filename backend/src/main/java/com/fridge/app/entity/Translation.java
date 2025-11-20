package com.fridge.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter; // Import Setter

@Entity
@Table(name = "translation")
@Getter
@Setter 
@NoArgsConstructor 
public class Translation extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "translation_id")
    private Long translationId;

    @Column(name = "language_code", nullable = false)
    private String languageCode;

    @Column(name = "translated_word", nullable = false)
    private String translatedWord;

    @Column(name = "example_sentence") // Added for AI features
    private String exampleSentence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;
}