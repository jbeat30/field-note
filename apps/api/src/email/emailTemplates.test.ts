import {
  buildClosureEmail,
  buildPasswordResetEmail,
  buildSecurityNoticeEmail,
} from './accountEmails';
import { escapeHtml } from './escapeHtml';
import { buildVerificationEmail } from './verificationEmail';

describe('메일 본문의 특수문자 처리', () => {
  it('escapeHtml은 태그·속성에 쓰이는 문자를 치환한다', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('보안 알림의 새 주소 표시에 태그가 있어도 HTML 본문에서는 글자로만 나온다', () => {
    const mail = buildSecurityNoticeEmail('EMAIL_CHANGED', 'a@example.com', '<img src=x>');

    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img src=x&gt;');
    // 텍스트 본문은 그대로
    expect(mail.text).toContain('<img src=x>');
  });

  it('링크는 속성 값으로 안전하게 들어간다', () => {
    const link = 'https://app.example.com/reset-password/abc"onmouseover="x';

    expect(buildPasswordResetEmail('a@example.com', link, 30).html).not.toContain('"onmouseover');
    expect(buildClosureEmail('a@example.com', link, new Date()).html).not.toContain('"onmouseover');
  });

  it('인증 코드 메일에는 코드와 유효 시간만 담긴다', () => {
    const mail = buildVerificationEmail('a@example.com', '123456', 10);

    expect(mail.html).toContain('123456');
    expect(mail.text).toContain('10분');
    expect(mail.text).not.toContain('a@example.com');
  });
});
