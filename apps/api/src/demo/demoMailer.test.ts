import type { MailMessage, Mailer } from '../email/mailer';

import { guardDemoMailer } from './demoMailer';
import { PUBLIC_DEMO } from './publicDemo';

const message = (to: string): MailMessage => ({
  to,
  subject: '제목',
  text: '본문',
  html: '<p>본문</p>',
});

describe('시연 계정 메일 차단', () => {
  const setup = () => {
    const sent: string[] = [];
    const inner: Mailer = {
      send: async (mail) => {
        sent.push(mail.to);
      },
    };
    const onSkip = jest.fn();

    return { sent, onSkip, mailer: guardDemoMailer(inner, onSkip) };
  };

  it('시연 계정으로 가는 메일은 보내지 않는다 (대소문자·공백이 달라도)', async () => {
    const { mailer, sent, onSkip } = setup();

    await mailer.send(message(PUBLIC_DEMO.email));
    await mailer.send(message(`  ${PUBLIC_DEMO.email.toUpperCase()} `));

    expect(sent).toEqual([]);
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it('다른 주소로 가는 메일은 그대로 보낸다', async () => {
    const { mailer, sent, onSkip } = setup();

    await mailer.send(message('someone@example.com'));

    expect(sent).toEqual(['someone@example.com']);
    expect(onSkip).not.toHaveBeenCalled();
  });
});
