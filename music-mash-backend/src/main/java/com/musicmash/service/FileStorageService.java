package com.musicmash.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    private static final String[] ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/wav", "audio/mp3"};
    private static final String[] ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"};

    public String storeFile(MultipartFile file, String fileType) throws IOException {
        validateFile(file, fileType);

        String fileExtension = getFileExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString() + "." + fileExtension;
        
        Path targetLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(targetLocation);
        
        Path destination = targetLocation.resolve(fileName);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        
        return "/uploads/" + fileName;
    }

    private void validateFile(MultipartFile file, String fileType) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds maximum limit of 100MB");
        }

        String contentType = file.getContentType();
        
        if ("audio".equals(fileType)) {
            if (!isAllowedContentType(contentType, ALLOWED_AUDIO_TYPES)) {
                throw new RuntimeException("Invalid audio file type. Allowed types: mp3, wav");
            }
        } else if ("video".equals(fileType)) {
            if (!isAllowedContentType(contentType, ALLOWED_VIDEO_TYPES)) {
                throw new RuntimeException("Invalid video file type. Allowed types: mp4, mov");
            }
        } else if ("image".equals(fileType)) {
            if (!contentType.startsWith("image/")) {
                throw new RuntimeException("Invalid image file type");
            }
        }
    }

    private boolean isAllowedContentType(String contentType, String[] allowedTypes) {
        if (contentType == null) return false;
        for (String allowedType : allowedTypes) {
            if (contentType.equals(allowedType)) {
                return true;
            }
        }
        return false;
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1) return "";
        return filename.substring(lastDot + 1).toLowerCase();
    }
}
