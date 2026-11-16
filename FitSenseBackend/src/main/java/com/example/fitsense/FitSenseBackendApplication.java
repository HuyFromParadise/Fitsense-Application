package com.example.fitsense;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FitSenseBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitSenseBackendApplication.class, args);
    }

}
