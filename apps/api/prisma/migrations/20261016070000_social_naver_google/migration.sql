-- 네이버·구글 소셜 로그인 (서비스 기획서 §6.1): 제공자 종류 추가
ALTER TYPE "social_provider" ADD VALUE IF NOT EXISTS 'NAVER';
ALTER TYPE "social_provider" ADD VALUE IF NOT EXISTS 'GOOGLE';
