import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

type MailpitMessage = { subject: string; to: string[]; text: string };

export type TestMailpit = {
  smtpPort: number;
  host: string;
  // 받은 메일 전체 (최신순)
  messages: () => Promise<MailpitMessage[]>;
  // 조건에 맞는 메일이 도착할 때까지 기다림 (작업 큐가 비동기로 보내므로)
  waitForMessage: (to: string, timeoutMs?: number) => Promise<MailpitMessage>;
  // 해당 주소로 온 메일이 지정한 개수가 될 때까지 기다림
  waitForCount: (to: string, count: number, timeoutMs?: number) => Promise<MailpitMessage[]>;
  stop: () => Promise<void>;
};

/**
 * @description 실제 Mailpit 컨테이너를 띄워 SMTP로 받은 메일을 HTTP로 읽는 테스트 도구
 * 로컬 개발과 같은 도구로 메일 발송을 끝까지 검증하기 위해 사용
 * @returns Mailpit 핸들
 */
export const startTestMailpit = async (): Promise<TestMailpit> => {
  const container: StartedTestContainer = await new GenericContainer('axllent/mailpit:latest')
    .withExposedPorts(1025, 8025)
    .withWaitStrategy(Wait.forHttp('/api/v1/info', 8025))
    .start();
  const host = container.getHost();
  const apiBase = `http://${host}:${container.getMappedPort(8025)}/api/v1`;

  const messages = async (): Promise<MailpitMessage[]> => {
    const list = (await (await fetch(`${apiBase}/messages`)).json()) as {
      messages: { ID: string; Subject: string; To: { Address: string }[] }[];
    };

    return Promise.all(
      list.messages.map(async (item) => {
        const detail = (await (await fetch(`${apiBase}/message/${item.ID}`)).json()) as {
          Text: string;
        };

        return {
          subject: item.Subject,
          to: item.To.map((address) => address.Address),
          text: detail.Text,
        };
      }),
    );
  };

  return {
    smtpPort: container.getMappedPort(1025),
    host,
    messages,
    waitForMessage: async (to, timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const found = (await messages()).find((message) => message.to.includes(to));

        if (found) {
          return found;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      throw new Error(`[testMailpit.waitForMessage] ${to} 수신 메일 없음`);
    },
    waitForCount: async (to, count, timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const found = (await messages()).filter((message) => message.to.includes(to));

        if (found.length >= count) {
          return found;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      throw new Error(`[testMailpit.waitForCount] ${to} 수신 메일이 ${count}통에 도달하지 않음`);
    },
    stop: async () => {
      await container.stop();
    },
  };
};
