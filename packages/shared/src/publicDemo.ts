import { z } from 'zod';

// 로그인 화면의 시연 계정 안내: 켜져 있을 때만 아이디·비밀번호를 내려줌 (가상 데이터를 담은 공개 계정이라 비밀이 아님)
export const publicDemoResponseSchema = z.object({
  enabled: z.boolean(),
  loginId: z.string().optional(),
  password: z.string().optional(),
});

export type PublicDemoResponse = z.infer<typeof publicDemoResponseSchema>;
