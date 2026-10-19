# Music Mash - Database Design

## Entity Relationship Diagram

User Table
- id (PK)
- email
- password
- role
- created_at
- updated_at
- is_active
- last_login

Profile Table
- id (PK)
- user_id (FK)
- display_name
- bio
- avatar_url
- location
- date_of_birth
- created_at
- updated_at

Instrument Table
- id (PK)
- profile_id (FK)
- name
- category
- skill_level
- years_experience
- is_primary

Performance Table
- id (PK)
- user_id (FK)
- title
- description
- category
- file_url
- file_type
- duration
- file_size
- status
- submitted_at
- reviewed_at
- ai_analyzed

Evaluation Table
- id (PK)
- performance_id (FK)
- judge_id (FK)
- pitch_score
- rhythm_score
- timing_score
- technique_score
- creativity_score
- expression_score
- overall_score
- comments
- suggestions
- created_at

AIAnalysisResult Table
- id (PK)
- performance_id (FK)
- pitch_accuracy
- rhythm_score
- tempo_score
- note_accuracy
- audio_quality
- noise_level
- overall_score
- feedback
- analysis_date

Competition Table
- id (PK)
- host_id (FK)
- title
- description
- category
- start_date
- end_date
- status
- prize
- created_at

Challenge Table
- id (PK)
- competition_id (FK)
- title
- description
- rules
- start_date
- end_date
- max_participants
- status

Participation Table
- id (PK)
- competition_id (FK)
- user_id (FK)
- performance_id (FK)
- joined_at
- rank
- score

Leaderboard Table
- id (PK)
- user_id (FK)
- competition_id (FK)
- total_score
- rank
- improvement_rate
- consistency_score
- updated_at

Notification Table
- id (PK)
- user_id (FK)
- type
- title
- message
- is_read
- created_at

SkillHistory Table
- id (PK)
- user_id (FK)
- skill_level
- score
- date
- evaluation_count
- competition_count
