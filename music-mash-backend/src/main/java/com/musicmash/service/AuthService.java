package com.musicmash.service;

import com.musicmash.dto.AuthResponseDTO;
import com.musicmash.dto.LoginRequestDTO;
import com.musicmash.dto.RegisterRequestDTO;
import com.musicmash.entity.Role;
import com.musicmash.entity.User;
import com.musicmash.entity.Profile;
import com.musicmash.exception.DuplicateEmailException;
import com.musicmash.exception.DuplicateUsernameException;
import com.musicmash.exception.InvalidCredentialsException;
import com.musicmash.repository.UserRepository;
import com.musicmash.repository.ProfileRepository;
import com.musicmash.util.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, ProfileRepository profileRepository,
                       PasswordEncoder passwordEncoder, 
                       JwtUtil jwtUtil, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponseDTO register(RegisterRequestDTO request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email already registered: " + request.getEmail());
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateUsernameException("Username already taken: " + request.getUsername());
        }

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getRole() != null ? request.getRole() : Role.USER,
                true
        );

        User savedUser = userRepository.save(user);
        
        // Auto-create Profile for new user
        Profile profile = new Profile();
        profile.setUser(savedUser);
        profile.setDisplayName(savedUser.getUsername());
        profileRepository.save(profile);
        
        String token = jwtUtil.generateToken(savedUser.getEmail());

        return new AuthResponseDTO(
                token,
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole()
        );
    }

    public AuthResponseDTO login(LoginRequestDTO request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        if (!user.getIsActive()) {
            throw new InvalidCredentialsException("Account is deactivated");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return new AuthResponseDTO(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole()
        );
    }

    public AuthResponseDTO getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("User not found"));

        String token = jwtUtil.generateToken(user.getEmail());

        return new AuthResponseDTO(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole()
        );
    }
}
