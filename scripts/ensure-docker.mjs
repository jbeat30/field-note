import { spawn, spawnSync } from 'node:child_process';

// Docker 데몬 기동 보장 (macOS·Windows에서는 Docker Desktop 자동 실행, bash 없이 동작)
const WINDOWS_DOCKER_DESKTOP = String.raw`C:\Program Files\Docker\Docker\Docker Desktop.exe`;
const WAIT_SECONDS = 120;

const isDockerReady = () => spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;

const startDockerDesktop = () => {
  const launch =
    process.platform === 'darwin'
      ? ['open', ['-a', 'Docker']]
      : process.platform === 'win32'
        ? [WINDOWS_DOCKER_DESKTOP, []]
        : null;

  if (!launch) {
    return false;
  }

  const child = spawn(launch[0], launch[1], { detached: true, stdio: 'ignore' });

  child.on('error', () => {});
  child.unref();

  return true;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!isDockerReady() && startDockerDesktop()) {
  console.log('[ensure-docker] Docker Desktop 실행');

  for (let waited = 0; waited < WAIT_SECONDS && !isDockerReady(); waited += 2) {
    await sleep(2000);
  }
}

if (!isDockerReady()) {
  console.error('[ensure-docker] Docker 데몬에 연결할 수 없음');
  process.exit(1);
}
