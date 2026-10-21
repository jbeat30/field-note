# 서버 구축·배포 가이드 (AWS Lightsail 서울 VPS 한 대)

> 이 문서는 실제로 서버를 만든 순서 그대로 적었다. 빈 서버에서 시작해 HTTPS로 서비스가 뜨고, 백업·메일·점검 작업이 돌아가기까지를 따라 할 수 있게 한다
> 구성 설명은 `docs/10-deployment-prep.md`, 백업·복구 절차는 `docs/05-backup-restore.md`, 다음 버전 계획은 `docs/12-next-version-plan.md`
> **접속 키·비밀번호·R2 키·Gmail 앱 비밀번호는 채팅·저장소·메신저에 붙여 넣지 않는다.** 값은 서버의 `deploy/.env`와 `deploy/ops.env`에만 둔다
> 명령은 리눅스 bash 기준이다. 내 PC가 Windows라면 "내 PC에서 실행" 표시가 있는 명령에 PowerShell 버전을 함께 적었다. 서버 안(`ubuntu@…` 프롬프트)에서는 항상 bash다
> 가입 화면(AWS·Cloudflare·Google·GitHub)의 메뉴 이름은 바뀔 수 있다. 화면이 다르면 같은 뜻의 항목을 찾아 진행한다

## 0. 읽는 법

**명령을 어디서 치는지 먼저 구분한다.** 가장 흔한 실수가 서버 창에 PowerShell 명령을 치거나 그 반대로 하는 것이다.

| 표시       | 뜻                                  | 프롬프트 모양             |
| ---------- | ----------------------------------- | ------------------------- |
| 🖥 내 PC    | 내 컴퓨터의 터미널                  | `PS C:\Users\…>` 또는 `$` |
| ☁ 서버     | SSH로 접속한 서버 안                | `ubuntu@ip-…:~$`          |
| 🌐 웹 화면 | AWS·Cloudflare·Google·GitHub 사이트 | 브라우저                  |

**버추얼머신(Ubuntu)으로 따라 해 볼 때**: §3~§8의 서버 안 작업(SSH·Docker·clone·env·nano·크론)은 VM에서 그대로 된다. 다만 VM에는 공인 IP가 없어 Let's Encrypt 인증서(§11)와 소셜 로그인 주소는 확인할 수 없다. VM 연습 방법은 §16에 따로 정리했다

## 1. 전체 순서

| 단계 | 하는 일                                                 | 어디서       | 절       |
| ---- | ------------------------------------------------------- | ------------ | -------- |
| 1    | 왜 이 구성인지 이해 (서버·저장소·메일·웹서버 선택 이유) | 읽기         | §2       |
| 2    | 서버 만들기: Lightsail 인스턴스, 고정 IP, 방화벽        | 🌐           | §3       |
| 3    | 내 PC에서 SSH 키 만들기                                 | 🖥            | §4       |
| 4    | 서버에 처음 접속, 내 키 등록, 비밀번호 로그인 막을 준비 | 🖥 → ☁        | §5       |
| 5    | GitHub 배포 키(서버에서 만든 읽기 전용 키) 등록, clone  | ☁ + 🌐       | §6       |
| 6    | 서버 기본 설정 스크립트 (Docker·방화벽·fail2ban·스왑)   | ☁            | §7       |
| 7    | Cloudflare R2: 사진·문서 버킷, 백업 버킷, 키            | 🌐           | §8       |
| 8    | 서비스용 Gmail과 앱 비밀번호                            | 🌐           | §9       |
| 9    | 환경 변수 파일 만들고 채우기 (`.env`, `ops.env`)        | ☁            | §10      |
| 10   | 첫 배포, 메일·백업 접속 확인, 첫 회사 만들기            | ☁            | §11, §12 |
| 11   | 백업 키 서버 밖 보관, 점검 크론, 서버 점검              | ☁            | §13, §14 |
| 12   | 실환경 동작 시험, 갱신·되돌리기                         | ☁ + 브라우저 | §15, §17 |

## 2. 왜 이렇게 골랐나 (결정 이유)

### 2.1 서버: 왜 Lightsail인가 (Oracle·EC2를 건너뛴 이유)

처음 목표는 **월 0원**이었다. 이 서비스는 DB·API·작업 큐(pg-boss)가 상시로 돌아야 해서 잠드는 무료 PaaS는 맞지 않았고, 서버 한 대를 빌려 모두 올리는 방식(VPS)으로 정했다.

| 후보                      | 시도·검토 결과                                                                                                                                       | 결론       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Oracle Cloud 상시 무료 VM | 가입 후 도쿄가 홈 리전으로 잡혔고 ARM 인스턴스 생성이 `Out of host capacity`로 계속 실패했다. 홈 리전은 가입 뒤 바꿀 수 없어 서울에 만들 수도 없었다 | 포기       |
| AWS EC2                   | 켜져 있는 시간만큼 과금되고 디스크·IP·전송이 따로 계산된다. 신규 가입 프리 티어 크레딧($100)은 이 계정에서 2026-09-27에 만료되어 쓸 수 없었다        | 선택 안 함 |
| DigitalOcean 등 일반 VPS  | 가격은 비슷하나 이미 쓰는 AWS 계정과 서울 리전을 쓸 수 있는 쪽이 편했다                                                                              | 선택 안 함 |
| **AWS Lightsail 서울**    | **월 고정 요금**이라 청구 금액을 예측할 수 있다. 서버·디스크·고정 IP·방화벽이 한 화면에 묶여 있어 초보자가 설정할 것이 적다                          | **선택**   |

- 사양: **Ubuntu 24.04, 2GB 메모리 / 2 vCPU / 60GB SSD, 월 $12**. 이 서비스는 PostgreSQL(1GB 한도)·API(1GB 한도)·웹(256MB)을 한 서버에 올리는데, 1GB 서버는 이미지 빌드 중 메모리가 부족해진다. 2GB에 스왑 2GB(스크립트가 만듦)와 컨테이너 메모리 한도를 두면 안정적으로 돌았다
- **서울 리전**: 사용자(국내 현장 팀)와 가깝고 처리방침의 "국외 이전" 항목이 단순해진다
- 비용 목표를 "0원"에서 "예측 가능한 월 $12"로 바꾼 결정이며, 이 구성을 쓰면 나중에 사용량이 늘어도 같은 컨테이너 구성을 더 큰 서버로 옮기면 된다

### 2.2 고정 IP: 왜 필요한가

Lightsail 인스턴스의 기본 공인 IP는 **서버를 중지했다 켜면 바뀔 수 있다.** 이 서비스는 IP에 묶인 것이 여럿이라 IP가 바뀌면 한꺼번에 깨진다.

- 접속 주소 `52-79-90-250.sslip.io`가 **IP를 그대로 이름에 넣은 주소**다. IP가 바뀌면 주소가 바뀌고, Let's Encrypt 인증서도 그 주소로 발급돼 새로 받아야 한다
- 사진·문서 저장소(R2)의 CORS 허용 출처가 이 주소다. 바뀌면 업로드가 브라우저에서 막힌다
- 소셜 로그인(카카오·네이버·구글) 리다이렉트 주소가 이 주소로 등록된다. 바뀌면 앱 등록을 다시 해야 한다
- SSH 접속 대상과 내 PC의 `known_hosts` 기록도 IP 기준이다

Lightsail **Static IP**를 만들어 인스턴스에 붙이면 중지·재시작에도 IP가 유지된다. 고정 IP는 인스턴스에 연결해 둔 동안이 일반적인 사용법이며, 연결하지 않고 남겨 두면 요금이 붙을 수 있으니 콘솔의 안내를 확인한다.

### 2.3 도메인 없이 sslip.io를 쓴 이유

도메인(연 1만~2만 원 안팎)을 사지 않고 **IP를 이름으로 풀어 주는 무료 서비스 sslip.io**를 쓴다. `203-0-113-10.sslip.io`는 항상 `203.0.113.10`을 가리키므로, Caddy가 이 이름으로 **진짜 HTTPS 인증서**를 자동으로 받는다. 1.0.0 시점에는 이것으로 충분하고, 소셜 로그인 앱 등록과 메일 신뢰도(SPF·DKIM)를 위해 도메인은 후속 과제로 남겼다. 이 때문에 위의 고정 IP가 더 중요하다.

### 2.4 웹서버: 왜 Caddy인가 (nginx가 아니라)

| 요구                                                | Caddy                                                 | nginx                                  |
| --------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| HTTPS 인증서 발급·갱신                              | **설정 없이 자동** (Let's Encrypt, 만료 전 자동 갱신) | certbot을 따로 설치하고 갱신 크론 관리 |
| HTTP → HTTPS 전환, HTTP/3                           | 기본 제공                                             | 직접 설정                              |
| 정적 웹 제공 + `/api`를 API 컨테이너로 전달(프록시) | `Caddyfile` 40줄 안팎                                 | 설정이 길고 항목이 많다                |
| 보안 헤더(HSTS·CSP 등), 로그에서 토큰 가리기        | 한 파일(`deploy/Caddyfile`)에 같이 둠                 | 가능하지만 모듈·문법이 번거롭다        |

혼자 운영하는 서버에서 "인증서 만료로 서비스가 멈추는 사고"를 구조적으로 없애는 것이 가장 큰 이유다. 설정은 `deploy/Caddyfile` 하나이며 컨테이너(`web`)로 돌아간다. `SITE_ADDRESS` 환경 변수 하나로 접속 주소가 정해진다.

### 2.5 Docker Compose: 왜 서버에 Node·pnpm을 설치하지 않는가

서버에 **설치하는 것은 Docker뿐**이다. Node.js·npm·pnpm·PostgreSQL은 서버에 직접 설치하지 않고 **컨테이너 이미지 안에서 빌드·실행**한다.

- 로컬 개발 환경과 서버가 같은 이미지로 돌아 "내 PC에서는 되는데" 문제가 없다
- Node 24, pnpm, PostgreSQL 18 버전 관리를 이미지(`Dockerfile`)가 맡는다. 서버 OS를 업그레이드해도 영향이 없다
- 서버를 잃어도 새 서버에 Docker만 깔면 같은 명령으로 복원된다

컨테이너는 4종이다: `db`(PostgreSQL), `api`, `web`(Caddy), 그리고 필요할 때만 띄우는 `migrate`(DB 구조 갱신)·`ops`(운영자 명령·백업)다.

### 2.6 사진·문서 저장소와 메일

- **Cloudflare R2**: S3 호환 저장소. 10GB까지 저장 무료이고 다운로드(egress) 요금이 없다. 사진·문서 버킷과 **백업 전용 버킷을 따로** 만든다
- **메일은 서비스 전용 Gmail의 SMTP**: 도메인이 없어 전문 메일 서비스(SES·Resend 등)를 쓸 수 없고, 가입자가 적은 초기에는 Gmail 한도(하루 약 500통)로 충분하다. 자세한 내용은 §9

## 3. 서버 만들기 (Lightsail) 🌐

1. AWS 계정으로 Lightsail 콘솔(https://lightsail.aws.amazon.com)에 들어가 리전을 **서울(ap-northeast-2)**로 맞춘다
2. **Create instance**
   - 플랫폼 Linux/Unix, 블루프린트 **OS Only → Ubuntu 24.04 LTS**
   - SSH 키 쌍: 처음에는 **기본 키**를 쓴다 (내려받는 `.pem`은 §5에서 첫 접속에만 쓰고 내 키를 추가한다. 잃어도 콘솔의 브라우저 터미널로 들어가 복구할 수 있다)
   - 플랜 **$12 (2GB RAM, 2 vCPU, 60GB SSD)**, 인스턴스 이름 `field-note-prod`
3. **고정 IP**: 인스턴스 → Networking → **Create static IP** → 이 인스턴스에 연결, 이름 `field-note-prod-ip`. 이 IP(예: `203.0.113.10`)를 메모한다
4. **방화벽(IPv4 Firewall)** 규칙은 아래만 둔다. 나머지는 열지 않는다

   | 포트 | 프로토콜 | 허용 대상                                                                           |
   | ---- | -------- | ----------------------------------------------------------------------------------- |
   | 22   | TCP      | SSH. 가능하면 내 IP로 제한 (고정 IP가 없다면 전체 허용하고 fail2ban·키 인증에 의존) |
   | 80   | TCP      | 인증서 발급과 https 전환                                                            |
   | 443  | TCP      | HTTPS                                                                               |
   | 443  | UDP      | HTTP/3                                                                              |

   기본으로 들어 있는 22·80 규칙에 443 TCP와 UDP를 추가한다. 데이터베이스 포트(5432)는 **열지 않는다**

5. 접속 주소를 정한다: IP의 점을 하이픈으로 바꾸고 `.sslip.io`를 붙인다 → `203.0.113.10` → `203-0-113-10.sslip.io`. 이 값이 `SITE_ADDRESS`가 된다

### 이름 정리

| 항목                   | 값                                               | 비고                                       |
| ---------------------- | ------------------------------------------------ | ------------------------------------------ |
| 인스턴스               | `field-note-prod`                                |                                            |
| R2 버킷 (사진·문서)    | `field-note-files-prod`                          | 소문자·숫자·하이픈. 만든 뒤 이름 변경 불가 |
| R2 버킷 (백업)         | `field-note-backup-prod`                         | **위 버킷과 별개**                         |
| R2 접근 키             | `field-note-files-rw`, `field-note-backup-rw`    | 각각 해당 버킷만                           |
| 서비스 Gmail           | `fieldnote.service.<본인만 아는 숫자>@gmail.com` | 짧은 이름은 이미 쓰이는 경우가 많다        |
| Gmail 앱 비밀번호 이름 | `field-note-server`                              |                                            |
| 알림 받을 메일         | 본인이 매일 보는 개인 메일                       | 점검 작업이 실패하면 여기로 온다           |

## 4. 내 PC에서 SSH 키 만들기 🖥

SSH 키는 **열쇠 한 쌍**이다. 개인 키(`field-note-prod`)는 내 PC에만 두고 절대 남에게 주지 않으며, 공개 키(`field-note-prod.pub`)를 서버에 등록한다. 서버는 "이 공개 키와 짝인 개인 키를 가진 사람"만 들여보낸다. 비밀번호가 없으므로 비밀번호 추측 공격이 통하지 않는다.

**bash (Linux·macOS·Git Bash)**

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "field-note-prod" -f ~/.ssh/field-note-prod
# 비밀번호(passphrase)를 물으면 입력해 두는 것을 권장 (키 파일이 유출돼도 바로 쓰지 못함)
chmod 600 ~/.ssh/field-note-prod
cat ~/.ssh/field-note-prod.pub        # 공개 키: 이 한 줄을 서버에 등록한다
```

**PowerShell (Windows 10/11, OpenSSH 클라이언트 내장)**

```powershell
New-Item -ItemType Directory -Force "$HOME\.ssh" | Out-Null
ssh-keygen -t ed25519 -C "field-note-prod" -f "$HOME\.ssh\field-note-prod"
# 개인 키를 본인만 읽을 수 있게 (처음 한 번)
icacls "$HOME\.ssh\field-note-prod" /inheritance:r /grant:r "$($env:USERNAME):(R)"
Get-Content "$HOME\.ssh\field-note-prod.pub"      # 공개 키
```

- `ed25519`는 짧고 안전한 현재 권장 방식이다. 개인 키 파일(확장자 없는 쪽)은 **어디에도 붙여 넣거나 올리지 않는다**
- Lightsail이 내려준 `.pem`(기본 키)은 `~/.ssh/field-note-prod.pem`으로 옮겨 두고 같은 방식으로 권한을 제한한다 (`chmod 600` / `icacls`)

## 5. 서버에 처음 접속하고 내 키 등록 🖥 → ☁

기본 키(`.pem`)로 처음 들어가 **내 공개 키를 `authorized_keys`에 추가**한다. 이 등록이 있어야 §7에서 비밀번호·루트 로그인을 막아도 내가 들어올 수 있다.

**1) 기본 키로 접속** (🖥 bash / PowerShell 공통, 경로만 다르다)

```bash
ssh -i ~/.ssh/field-note-prod.pem ubuntu@203.0.113.10          # bash
```

```powershell
ssh -i "$HOME\.ssh\field-note-prod.pem" ubuntu@203.0.113.10    # PowerShell
```

처음에는 "fingerprint를 신뢰하겠냐"고 묻는다. `yes`를 입력하면 `known_hosts`에 기록된다.

**2) 내 공개 키 등록** (☁ 서버 안, 따옴표 안에 §4의 공개 키 한 줄을 붙여 넣는다)

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA...생략... field-note-prod" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

(리눅스·macOS PC라면 `ssh-copy-id -i ~/.ssh/field-note-prod.pub -o IdentityFile=~/.ssh/field-note-prod.pem ubuntu@203.0.113.10`으로 한 번에 된다)

**3) 내 키로 접속 확인** (🖥, 반드시 확인한 뒤 다음으로)

```bash
ssh -i ~/.ssh/field-note-prod ubuntu@203.0.113.10
```

**4) 접속을 짧게 (선택)**: `~/.ssh/config`에 이름을 붙여 둔다.

```text
Host field-note
  HostName 203.0.113.10
  User ubuntu
  IdentityFile ~/.ssh/field-note-prod
```

이후에는 `ssh field-note`로 접속한다 (Windows는 `C:\Users\<이름>\.ssh\config`).

## 6. GitHub 배포 키: 서버가 저장소를 내려받게 하기 ☁ + 🌐

저장소(`jbeat30/field-note`)가 **비공개**라서 서버가 `git clone`을 하려면 인증이 필요하다. 내 계정 비밀번호나 토큰을 서버에 두는 대신, **서버에서 새 SSH 키를 만들고 그 공개 키를 GitHub 저장소의 Deploy key로 등록**한다.

- 이 키는 **이 저장소 하나, 읽기 전용**으로만 등록한다. 서버가 뚫려도 코드를 읽을 수만 있고 올릴 수는 없다
- §4의 "내 PC → 서버" 키와는 **방향이 반대인 별개의 키**다: 서버가 GitHub에 접속할 때 쓴다

**1) 서버에서 배포 키 만들기** (☁)

```bash
ssh-keygen -t ed25519 -C "field-note-prod-deploy" -f ~/.ssh/github_deploy -N ""
chmod 600 ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub        # 이 한 줄을 복사
```

`-N ""`은 비밀번호 없이 만든다는 뜻이다. 서버가 사람 없이 `git fetch`를 해야 하기 때문이며, 대신 읽기 전용으로 등록해 위험을 줄인다.

**2) GitHub에 등록** (🌐): 저장소 → Settings → **Deploy keys** → Add deploy key. 제목 `field-note-prod`, 키에 위 공개 키를 붙여 넣고 **Allow write access는 체크하지 않는다**

**3) 서버가 이 키를 쓰도록 설정** (☁)

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com               # "Hi jbeat30/field-note! You've successfully authenticated" 가 나오면 성공
```

처음에는 GitHub의 fingerprint를 신뢰하겠냐고 묻는다 (`yes`).

**4) 저장소 내려받기** (☁)

```bash
sudo apt-get update && sudo apt-get install -y git
sudo install -d -o "$USER" -g "$USER" /srv/field-note        # 폴더를 ubuntu 소유로 먼저 만든다
git clone git@github.com:jbeat30/field-note.git /srv/field-note
cd /srv/field-note
git checkout --detach v1.0.0                                 # 배포할 태그 (최신 태그는 GitHub Releases에서 확인)
```

> **주의**: `sudo git clone`은 쓰지 않는다. `sudo`로 실행하면 루트 계정이 되어 `~/.ssh/github_deploy`를 찾지 못하고 `Permission denied (publickey)`로 실패한다. 폴더를 먼저 내 소유로 만들고 일반 계정으로 clone한다

## 7. 서버 기본 설정 스크립트 ☁

저장소에 들어 있는 `deploy/scripts/server-setup.sh`를 한 번 실행한다. 여러 번 실행해도 같은 결과다.

```bash
cd /srv/field-note
sudo ./deploy/scripts/server-setup.sh
```

스크립트가 하는 일 (필요하면 `cat deploy/scripts/server-setup.sh`로 읽어 본다):

| 작업               | 내용                                                                           | 이유                                                                   |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 시간대             | `Asia/Seoul`                                                                   | 크론 시각이 서버 시간 기준                                             |
| **Docker 설치**    | Docker 공식 apt 저장소에서 `docker-ce`, `docker-compose-plugin`                | 서버에 설치하는 유일한 런타임                                          |
| Docker 로그 한도   | 컨테이너 로그 10MB × 5개                                                       | 로그가 디스크를 채우지 않게                                            |
| docker 그룹        | 현재 계정을 `docker` 그룹에 추가                                               | `sudo` 없이 docker 사용 (다시 접속해야 적용)                           |
| 자동 보안 업데이트 | `unattended-upgrades` (재부팅은 자동으로 하지 않음)                            | 패치를 놓치지 않게                                                     |
| fail2ban           | SSH 로그인 실패 5회(10분 내)면 1시간 차단                                      | 무차별 대입 공격 완화                                                  |
| **SSH 강화**       | 비밀번호 로그인·루트 로그인 금지 (`/etc/ssh/sshd_config.d/99-field-note.conf`) | §5에서 `authorized_keys`에 내 키가 있을 때만 적용해 접속이 막히지 않게 |
| 방화벽 ufw         | 22(속도 제한)·80·443만 허용, 나머지 차단                                       | 클라우드 방화벽과 이중 방어                                            |
| 스왑 2GB           | 메모리 3GB 미만 서버에서만                                                     | 이미지 빌드 중 메모리 부족 방지                                        |
| 백업·로그 폴더     | `deploy/backups`(uid 1000 소유), `deploy/logs`(현재 계정 소유), logrotate      | 컨테이너와 크론이 각각 쓸 수 있어야 함                                 |

끝나면 **새 터미널을 열어** 접속이 되는지 확인한 뒤 기존 연결을 닫는다. 그리고 docker 그룹 적용을 위해 다시 접속한다.

```bash
# 🖥 새 터미널에서
ssh field-note        # 접속되는지 확인 (되면 기존 창은 닫아도 된다)

# ☁ 서버에서 확인
docker --version && docker compose version
sudo sshd -T | grep -Ei 'passwordauthentication|permitrootlogin'    # 둘 다 no
sudo ufw status verbose
sudo systemctl status fail2ban --no-pager | head -5
free -h                                                              # Swap 2.0Gi
```

## 8. Cloudflare R2: 버킷·CORS·접근 키·백업 보호 🌐

1. Cloudflare에 가입하고 R2 Object Storage를 켠다 (카드 등록이 필요할 수 있다). 무료 구간은 저장 10GB다. 사용량 알림을 설정해 둔다
2. 버킷 2개 생성 (위치 힌트 Asia-Pacific): `field-note-files-prod`, `field-note-backup-prod`. **Public access는 켜지 않는다**
3. **S3 엔드포인트**: R2 개요 화면의 **계정 ID**로 `https://<계정 ID>.r2.cloudflarestorage.com`이 된다
4. **사진·문서 버킷의 CORS**: 버킷 → Settings → CORS Policy. 허용 출처는 접속 주소와 **정확히 같아야** 한다. 틀리면 브라우저에서 사진 올리기가 막힌다

   ```json
   [
     {
       "AllowedOrigins": ["https://203-0-113-10.sslip.io"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

5. **접근 키 2개**: R2 → Manage API tokens → Create API token (**Account API token**), 버킷을 지정한다
   - `field-note-files-rw`: Object Read & Write, 대상 `field-note-files-prod`만
   - `field-note-backup-rw`: Object Read & Write, 대상 `field-note-backup-prod`만
   - 발급 화면의 **Access Key ID**와 **Secret Access Key**는 그 화면에서만 볼 수 있다. 바로 서버 파일(§10)에 넣고 어디에도 붙여 넣지 않는다
   - **계정 ID와 Access Key ID는 둘 다 32자 16진수라 헷갈리기 쉽다.** Access Key 칸에 계정 ID를 넣으면 401이 난다
6. **백업 버킷 보호**: R2에는 쓰기 전용 키가 없어서, 서버가 뚫려도 사본이 지워지지 않게 R2 쪽 규칙으로 막는다
   - **Bucket Lock**: 보존 기간 **14일** (올린 뒤 14일 동안 삭제·덮어쓰기 불가)
   - **Object lifecycle**: **30일** 지난 객체 삭제 (서버 키로 지우지 않고 R2가 알아서)
7. 두 접근 키는 서로 다른 버킷만 가리키므로 한쪽이 유출돼도 다른 쪽은 안전하다

## 9. 서비스용 Gmail과 메일 시스템 🌐

### 9.1 메일 시스템은 어떻게 만들어졌나 (구현 vs 사용자가 한 일)

메일 구조는 두 부분이다.

| 부분                             | 누가                    | 내용                                                                                                                                                                                                                 |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **메일을 보내는 코드**           | Claude가 구현           | `apps/api/src/email/mailer.ts`. Node 라이브러리 `nodemailer`로 SMTP 서버에 접속해 메일을 보낸다. 접속 정보(`SMTP_HOST`·`SMTP_PORT`·`SMTP_USER`·`SMTP_PASSWORD`·`SMTP_FROM`)는 코드에 없고 **환경 변수**에서만 읽는다 |
| **메일을 실제로 보내 주는 서버** | Google (smtp.gmail.com) | **SMTP 서버를 직접 만들거나 설치한 것이 없다.** Gmail이 이미 운영하는 SMTP 서버에 "이 Gmail 계정으로 로그인해 메일을 보내겠다"고 접속하는 방식이다                                                                   |
| **계정과 앱 비밀번호**           | 사용자                  | Google 계정 생성 → 2단계 인증 → 앱 비밀번호 발급. 이것이 **SMTP 설정의 전부**다                                                                                                                                      |

그래서 사용자가 "구글 계정 만들고 앱 등록만" 했다는 설명이 맞다. 별도로 SMTP 서버를 설정할 것은 없고, 그 앱 비밀번호를 서버의 `deploy/.env`에 `SMTP_PASSWORD=`로 넣은 것이 연결이다. 코드의 SMTP 설정 값은 아래처럼 고정되어 있다.

```text
SMTP_HOST=smtp.gmail.com      # Google의 SMTP 서버 주소 (고정)
SMTP_PORT=465                 # 465는 처음부터 암호화(TLS) 연결. 코드가 465면 secure로 연결
SMTP_USER=<서비스 Gmail 주소>
SMTP_PASSWORD=<앱 비밀번호 16자>
SMTP_FROM=<서비스 Gmail 주소>  # 로그인 계정과 같은 주소
```

코드에 들어 있는 안전 장치: 계정 정보를 보내는 연결은 TLS가 필수이고(평문으로 내려가지 않음), TLS 1.2 미만은 거부하며, 서버가 응답하지 않아도 10초(연결)·30초(소켓) 안에 끊는다. 실패한 메일은 작업 큐가 다시 시도한다.

메일이 쓰이는 곳: 가입 인증 코드, 비밀번호 재설정, **점검 작업 실패 알림**(`pnpm alert:mail`, 받는 주소는 `ops.env`의 `ALERT_MAIL_TO`)이다.

### 9.2 만드는 순서

1. 새 Google 계정을 만든다 (표시 이름 `필드노트`). **개인 계정과 분리**해 비밀번호 관리자에 저장한다 (서비스 계정이 침해돼도 개인 메일이 안전하고, 반대도 마찬가지)
2. 계정 → 보안 → **2단계 인증** 켜기 (앱 비밀번호의 전제 조건)
3. 계정 → 보안 → 2단계 인증 → **앱 비밀번호**에서 이름 `field-note-server`로 발급한다. **16자리가 한 번만 보인다.** 공백은 빼고 바로 `deploy/.env`의 `SMTP_PASSWORD`에 넣는다

**왜 앱 비밀번호인가**: 구글 계정 비밀번호를 서버에 두면 유출 시 계정 전체가 넘어간다. 앱 비밀번호는 "메일 보내기용 열쇠"로 따로 발급·폐기(언제든 계정 설정에서 삭제)할 수 있고, 2단계 인증 없이는 만들 수 없다. 서버 한 곳이 뚫려도 계정 비밀번호는 지켜진다.

### 9.3 한도와 발신자 표시

| 항목                  | 내용                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 일일 한도             | 일반 Gmail 계정은 **하루 약 500통**(수신자 수 기준, 24시간 롤링)이다. 넘으면 한동안 발송이 막히고 `mail:check`·인증 메일이 실패한다. 한도는 Google 정책에 따라 바뀔 수 있다 |
| 이 한도로 충분한 이유 | 이 서비스의 메일은 가입 인증·재설정·실패 알림뿐이라 가입자 수십 명 규모에서는 하루 수십 통 이하다. 한도에 가까워지면 전문 메일 서비스(SES·Resend)로 옮긴다                  |
| 보낸 사람 표시        | 받는 사람에게는 **그 Gmail 주소**가 보낸 사람으로 보인다. `SMTP_FROM`을 로그인 계정과 **같은 주소**로 둬야 한다. 다르면 Gmail이 로그인 계정 주소로 바꿔 보내거나 거부한다   |
| 스팸함                | 도메인 인증(SPF·DKIM)이 우리 도메인이 아니라 gmail.com 것이라 수신 쪽에서 스팸함으로 분류될 수 있다. 첫 시험에서 스팸함도 확인한다                                          |
| 한계                  | 하나의 계정이 한 번에 보낼 수 있는 속도에도 제한이 있다. 대량 발송·마케팅 메일에는 쓰지 않는다                                                                              |

## 10. 환경 변수 파일 ☁

### 10.1 `.env`와 `ops.env`는 무엇인가

| 파일             | 읽는 컨테이너                              | 담긴 값                                                                                           |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `deploy/.env`    | db, api, web, migrate, ops                 | 접속 주소, DB 앱 계정, 비밀 값(세션·2단계 인증 암호화), R2(사진·문서) 키, Gmail SMTP              |
| `deploy/ops.env` | **migrate, ops만** (api·web에는 주지 않음) | 운영자 DB 계정, 삭제(purge) 계정, **백업 암호화 키**, **서버 밖 백업 R2 키**, 알림 받을 메일 주소 |

**`ops`는 operations(운영)의 줄임말이다.** 서비스가 돌아가는 동안 쓰는 값이 아니라 **운영자가 서버를 관리할 때만 쓰는 도구**(백업, 회사 만들기, 해지 회사 삭제, 복구 시험)의 설정이다. 이 값들을 `.env`와 나눈 이유는 **권한 분리**다. API 컨테이너는 인터넷에서 오는 요청을 직접 받는 가장 위험한 곳이라, 만에 하나 API가 뚫려도 백업 암호화 키·모든 회사를 볼 수 있는 DB 계정·백업 버킷 키가 그 안에 없도록 파일 자체를 나눈다. `docker-compose.yml`에서 `api`는 `env_file: .env`만, `ops`·`migrate`는 `.env`와 `ops.env`를 둘 다 읽는다. 두 파일 모두 `.gitignore`로 저장소에서 제외된다.

### 10.2 템플릿을 복사해서 만든다 (`init-env.sh`)

저장소에는 값이 비어 있는 **템플릿**만 있다: `deploy/env.example`, `deploy/ops.env.example`. `init-env.sh`가 이것을 복사해 실제 파일을 만들면서 **비밀 값을 자동으로 채운다**. 사람이 비밀번호를 지어낼 필요가 없고, DB 비밀번호가 두 파일에서 서로 같도록 맞춰 준다.

```bash
cd /srv/field-note
./deploy/scripts/init-env.sh
# [init-env] deploy/.env 생성 완료
# [init-env] deploy/ops.env 생성 완료
```

템플릿 안의 두 종류 표시:

| 표시       | 뜻                                                   | 누가 채우나                                                                                |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `{{토큰}}` | DB 비밀번호, 세션·암호화 비밀 값, **백업 암호화 키** | `init-env.sh`가 `openssl rand`로 무작위 생성해 자동 채움 (같은 토큰은 두 파일에서 같은 값) |
| `<꺾쇠>`   | 접속 주소, R2 키, Gmail, 알림 메일                   | **사용자가 직접** 채움 (가입한 서비스에서 받은 값)                                         |

- 생성된 파일의 권한은 `600`(본인만 읽기·쓰기)이다
- 이미 파일이 있으면 건너뛴다. `--force`는 DB 비밀번호가 바뀌므로 DB를 새로 만들 때만 쓴다
- 서버에는 Node가 없으므로 `openssl`만 쓰도록 만들었다 (`pnpm env:init`은 로컬 개발용)

### 10.3 nano로 값 채우기

`nano`는 터미널 안의 간단한 문서 편집기다 (마우스 없이 키보드로 조작).

```bash
nano deploy/.env
```

| 키                    | 동작                                                    |
| --------------------- | ------------------------------------------------------- |
| 화살표 키             | 커서 이동                                               |
| 글자 입력·Backspace   | 입력·삭제 (터미널 붙여넣기: 우클릭 또는 `Ctrl+Shift+V`) |
| `Ctrl+O` 다음 `Enter` | 저장                                                    |
| `Ctrl+X`              | 나가기 (저장 안 했으면 저장할지 묻는다)                 |
| `Ctrl+W`              | 검색 (`<` 를 검색해 남은 자리표시자를 찾는다)           |
| `Ctrl+K`              | 현재 줄 잘라내기                                        |

`<꺾쇠>` 부분 전체를 지우고 값을 넣는다 (예: `S3_BUCKET=<사진·문서 버킷 이름>` → `S3_BUCKET=field-note-files-prod`). `vi`가 익숙하면 그걸 써도 된다.

### 10.4 채울 값

| 파일             | 변수                                            | 값                                              |
| ---------------- | ----------------------------------------------- | ----------------------------------------------- |
| `deploy/.env`    | `SITE_ADDRESS`                                  | §3-5의 `203-0-113-10.sslip.io`                  |
| `deploy/.env`    | `S3_ENDPOINT`                                   | `https://<계정 ID>.r2.cloudflarestorage.com`    |
| `deploy/.env`    | `S3_BUCKET`                                     | `field-note-files-prod`                         |
| `deploy/.env`    | `S3_ACCESS_KEY` / `S3_SECRET_KEY`               | `field-note-files-rw` 토큰의 키 (§8-5)          |
| `deploy/.env`    | `SMTP_USER` / `SMTP_FROM`                       | 서비스 Gmail 주소 (두 값이 같아야 함)           |
| `deploy/.env`    | `SMTP_PASSWORD`                                 | 앱 비밀번호 16자 (공백 없이)                    |
| `deploy/ops.env` | `ALERT_MAIL_TO`                                 | 알림 받을 개인 메일                             |
| `deploy/ops.env` | `BACKUP_S3_ENDPOINT` / `BACKUP_S3_BUCKET`       | 같은 계정 엔드포인트 / `field-note-backup-prod` |
| `deploy/ops.env` | `BACKUP_S3_ACCESS_KEY` / `BACKUP_S3_SECRET_KEY` | `field-note-backup-rw` 토큰의 키 (§8-5)         |

- 꺾쇠 `<…>`가 남아 있으면 `deploy.sh`가 멈추고 어느 항목인지 알려 준다
- `PUBLIC_DEMO_ENABLED=true`(공개 시연 환경)는 템플릿 기본값이다. 서비스 단계에서는 `false`로 바꾼다
- 소셜 로그인 키(`KAKAO_*` 등)는 앱을 등록한 뒤 주석을 풀어 채운다. 리다이렉트 주소는 `https://<SITE_ADDRESS>/api/v1/auth/{kakao|naver|google}/callback`이며, IP가 바뀌면 다시 등록해야 해서 고정 IP가 필요하다
- 값을 화면에 찍어 확인하지 않는다. 확인이 필요하면 길이나 형식만 본다 (`awk -F= '/^SMTP_USER/{print $2}' deploy/.env`처럼 비밀이 아닌 항목만)

## 11. 첫 배포와 접속 확인 ☁

```bash
cd /srv/field-note
./deploy/scripts/deploy.sh
```

`deploy.sh`는 항상 같은 순서로 동작한다: `.env` 검사(꺾쇠 남았는지) → (이미 떠 있으면) 배포 전 백업 → 이미지 빌드(2GB 서버에서 수 분~10여 분) → DB 시작 → 마이그레이션과 DB 계정 비밀번호 설정 → api·웹 시작 → 헬스 체크(`https://<SITE_ADDRESS>/api/v1/health`).

> 인증서 발급에 1~2분 걸릴 수 있다. 헬스 체크가 실패하면 80·443이 열렸는지(§3-4), `SITE_ADDRESS`의 IP가 서버 고정 IP인지 확인한다. sslip.io는 많은 사람이 공유하는 주소라 발급 횟수 제한에 걸리면 Caddy가 다른 발급 기관으로 자동 전환한다. 계속 실패하면 몇 시간 뒤 다시 시도한다

배포 후 메일·서버 밖 저장소 접속 확인 (명령이 길어 단축어를 쓴다):

```bash
C="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
$C run --rm ops pnpm mail:check 본인메일@example.com    # SMTP 연결·TLS·로그인 + 확인 메일 한 통 (스팸함도 확인)
$C run --rm ops pnpm backup remote-check                # 백업 버킷에 확인용 파일을 올리고 확인
```

- `mail:check` 실패 시: 앱 비밀번호 공백·오타, 2단계 인증 여부, `SMTP_USER`와 `SMTP_FROM` 일치를 본다
- `remote-check` 실패 시: 엔드포인트의 계정 ID, 버킷 이름, 접근 키가 **백업 버킷용**인지 본다

## 12. 서버 단축어, 첫 회사 만들기

로그인할 때마다 긴 docker compose 명령을 치지 않도록 `deploy/server-aliases.sh`의 함수를 `~/.bashrc`에 넣는다.

```bash
cat deploy/server-aliases.sh >> ~/.bashrc && source ~/.bashrc
new-company "회사 이름" "관리자 이름"      # 회사 + 관리자 초대 링크 생성 (링크는 7일 유효, 한 번만 표시)
list-companies                             # 회사 목록과 상태
reissue-invite <회사 ID>                   # 가입 전 회사의 초대 링크 다시 발급
fnc ps                                     # docker compose 단축 (fnc logs api 등)
fn-ops pnpm operator list                  # ops 컨테이너로 운영자 명령 실행 (알려진 pnpm 경고 줄은 숨김)
```

약관·처리방침을 DB에 등록한다 (처음 한 번, 문서를 고쳐 판을 올릴 때마다):

```bash
fn-ops pnpm operator legal-register
```

공개 시연 환경(선택): 가상 데이터만 담은 `Test Company`를 두고 로그인 화면에 시연 계정을 안내한다.

```bash
fn-ops pnpm operator demo-reset            # 시연 회사 생성 또는 처음 상태로 되돌리기 (약관이 먼저 등록돼 있어야 함)
```

시연 환경을 끌 때는 `.env`에 `PUBLIC_DEMO_ENABLED=false`, 크론의 시연 줄 삭제, `pnpm operator demo-remove` 순서로 정리한다.

## 13. 백업과 백업 키 🖥 ☁

### 13.1 무엇을, 어디에 백업하나

백업 대상은 **PostgreSQL 데이터 전체**(업무 데이터·세션·DB 계정 정의)다. 사진·문서 파일은 이미 R2에 있으므로 DB 백업에 들어가지 않는다.

백업은 **두 곳**에 남는다.

| 위치                       | 경로                                                   | 용도                                                                        |
| -------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| 서버 안                    | `/srv/field-note/deploy/backups/<생성 시각>/`          | 빠른 복구, 복구 시험. 서버 디스크가 망가지면 함께 사라진다                  |
| **서버 밖** (R2 백업 버킷) | `field-note-backup-prod` 버킷의 `field-note/<백업ID>/` | 서버를 통째로 잃었을 때. **다른 버킷·다른 접근 키**라 사진 버킷 사고와 분리 |

한 번의 백업(`pnpm backup create`)이 만드는 파일: `db.dump.enc`(암호화된 DB 덤프), `roles.sql.enc`(DB 계정 정의, 비밀번호 제외), `manifest.json`(체크섬·테이블별 행 수). 평문 파일은 디스크에 남지 않는다 (흘려보내며 암호화).

### 13.2 백업 키란

`BACKUP_ENCRYPTION_KEY`는 백업 파일을 **AES-256-GCM으로 암호화하는 32바이트 비밀 값**이다. 서버 밖 저장소(R2)에 올라간 백업이 유출돼도 이 키 없이는 내용을 읽을 수 없다. 반대로 **이 키를 잃으면 백업을 아무도 풀 수 없다.** 운영에서는 키가 없으면 백업을 만들지 않고 중단한다.

### 13.3 키는 어떻게, 어디서 만드나

별도로 만드는 것이 아니라 **§10.2의 `init-env.sh`가 서버에서 자동으로 생성**한다.

```bash
# init-env.sh 안에서 쓰는 방식 (32바이트 무작위 → base64url)
openssl rand -base64 32 | tr -d '\n=' | tr '+/' '-_'
```

생성된 값은 서버의 `deploy/ops.env`의 `BACKUP_ENCRYPTION_KEY=`에 들어가며 권한은 `600`이다. 직접 만들고 싶다면 위 명령으로 만든 값을 넣으면 된다 (이미 백업이 있다면 키를 바꾸면 이전 백업을 풀 수 없으므로 바꾸지 않는다).

### 13.4 키를 서버 밖에 따로 보관한다 (가장 중요)

키가 서버 안에만 있으면 서버를 잃을 때 **백업과 키가 함께 사라진다.** 서버 밖에 한 부를 따로 둔다.

```bash
# ☁ 서버에서 한 번만 값을 보고 (화면 녹화·채팅·로그에 남기지 않는다)
grep '^BACKUP_ENCRYPTION_KEY=' deploy/ops.env
```

- 출력된 값을 **비밀번호 관리자**(1Password, Bitwarden 등)의 보안 노트에 저장한다. 항목 이름 예: `field-note 백업 암호화 키`
- 함께 보관하면 좋은 값: `TOTP_ENCRYPTION_KEY`(2단계 인증 키 암호화; 바꾸면 켜 둔 2단계 인증이 모두 확인 불가가 된다). 이 값은 DB 백업에 들어 있지 않고 `.env`에만 있어 서버를 잃으면 사라진다
- 분기마다 "서버 밖에 보관한 키로 실제 복호화가 되는지" 확인한다 (§13.6)
- 백업을 받는 R2 키(`BACKUP_S3_*`)와 백업 암호화 키는 **다른 비밀**이다. R2 키를 잃으면 새로 발급하면 되지만 암호화 키를 잃으면 복구 불가다

### 13.5 자동 백업과 보호 장치

크론이 매일 03:00에 `pnpm backup create`를 돌린다(§14). 한 번의 실행이 하는 일: 암호화 백업 생성 → 서버 밖 R2에 업로드하고 크기 확인 → 30일 지난 백업 정리.

- R2 백업 버킷의 **Bucket Lock 14일 + 수명 주기 30일**(§8-6)이 서버 침해 시에도 사본이 지워지는 것을 막는다
- 매주 월요일 04:00 **복구 시험**(`pnpm backup drill`)이 최근 백업을 임시 DB에 복구해 체크섬·행 수·마이그레이션·회사 격리(RLS) 5개 항목을 검증한다. "복구해 봐야 백업이다"
- 실패하면 `ALERT_MAIL_TO`로 알림 메일이 온다 (§14)

### 13.6 수동 명령과 복구

```bash
fn-ops pnpm backup create                         # 지금 백업 (서버 안 + R2)
fn-ops pnpm backup list                           # 목록
fn-ops pnpm backup remote-check                   # R2 백업 버킷 접속·권한 확인
fn-ops pnpm backup drill                          # 복구 시험
fn-ops pnpm backup decrypt <백업ID> <풀어 둘 폴더>  # 복구용으로 풀기 (평문이므로 끝나면 폴더를 지운다)
```

서버를 잃었을 때의 복구 절차는 `docs/05-backup-restore.md`의 "실제 복구 절차"를 따른다. 요약: 새 서버를 §3~§7로 만들고 → R2에서 백업 폴더를 내려받고 → **서버 밖에 보관한 `BACKUP_ENCRYPTION_KEY`**로 `decrypt` → `roles.sql` 적용, `pg_restore` → `pnpm db:setup`.

## 14. 점검 작업 크론과 서버 점검 ☁

`ops/crontab.example`의 내용을 서버 일반 계정의 크론에 붙여 넣는다 (저장소가 `/srv/field-note`가 아니면 경로를 바꾼다).

```bash
crontab -e      # 처음이면 편집기를 고른다 (nano가 쉽다). crontab.example 내용을 붙여 넣고 저장
crontab -l      # 등록 확인
```

| 시각              | 작업                                           |
| ----------------- | ---------------------------------------------- |
| 매일 03:00        | 암호화 백업, 서버 밖 사본, 30일 지난 백업 정리 |
| 매일 03:30        | 해지 유예(14일)가 끝난 회사 삭제·익명화        |
| 매주 월요일 04:00 | 복구 시험                                      |
| 매일 04:30        | 공개 시연 회사 초기화                          |

각 작업은 `run-ops.sh`가 감싸서 **겹쳐 실행되지 않게 잠그고**, 결과를 `deploy/logs/<작업>.log`에 남기며, 실패하면 알림 메일을 보낸다.

크론을 기다리지 않고 한 번씩 실행해 확인한다.

```bash
./deploy/scripts/run-ops.sh backup pnpm backup create
./deploy/scripts/run-ops.sh drill pnpm backup drill
./deploy/scripts/run-ops.sh alert-test false      # 일부러 실패시켜 알림 메일이 오는지 확인 (종료 코드 1이 정상)
sudo ./deploy/scripts/server-check.sh             # 포트·SSH·방화벽·컨테이너·백업 15개 항목 점검 (결과는 마지막에 한꺼번에 출력되므로 멈춘 것처럼 보여도 기다린다)
```

## 15. 실환경 동작 시험 체크리스트

1.0.0 첫 배포 전에 모두 통과해야 했던 목록이다 (결과: 아래 한 항목을 제외하고 통과).

- [x] `https://<SITE_ADDRESS>`가 열리고 인증서가 유효하다, `http://`는 https로 넘어간다
- [x] 개발자 도구 콘솔에 CSP 위반이 없다, 응답 헤더에 HSTS·CSP·nosniff·`Referrer-Policy: no-referrer`
- [x] 초대 링크로 가입 → 이메일 인증 코드 메일 도착 → 로그인 → 2단계 인증 켜고 끄기
- [x] 비밀번호 재설정 메일 도착과 재설정
- [x] 시연 환경: 로그인 화면 안내, `tester` 로그인, `demo-reset`이 끝난 뒤 시연 회사의 사진이 R2에서 사라진다
- [x] 사진·문서 올리기와 내려받기, 썸네일 생성 (R2 CORS·CSP)
- [ ] 두 곳에서 접속해 한쪽의 로그인 실패가 다른 쪽을 막지 않고 기기 목록에 실제 IP가 보인다 (운영 중 확인)
- [x] 회사 간 격리 외부 점검: `node scripts/isolation-probe.mjs` 종료 코드 0
- [x] 월 공수 엑셀·회사 전체 데이터 내려받기가 제한 시간 안에 끝난다
- [x] 백업 생성 → 서버 밖 버킷에 사본 → 복구 시험 통과, 백업 키로 `decrypt` 시험
- [x] `server-check.sh` 모두 통과
- [x] 처리방침·약관의 보호책임자·수탁·위탁·국외 이전을 채우고 버전을 올렸다

## 16. 버추얼머신(Ubuntu)으로 연습하기

VirtualBox·VMware·UTM 등에 Ubuntu 24.04 Server를 설치하고 §4~§7, §10~§14를 연습할 수 있다. 클라우드와 다른 점만 정리한다.

| 항목             | 클라우드(Lightsail)                | VM                                                                                                              |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 서버 만들기      | 콘솔에서 인스턴스 생성             | ISO로 Ubuntu 설치. 설치 중 **OpenSSH server**를 선택                                                            |
| 접속 IP          | 공인 고정 IP                       | 네트워크를 **브리지(Bridged)** 로 두고 `ip -4 addr`로 확인한 주소. NAT이면 포트 포워딩(호스트 2222 → 게스트 22) |
| 기본 계정        | `ubuntu`                           | 설치 때 만든 계정 (이 문서의 `ubuntu`를 그 이름으로 읽는다)                                                     |
| 처음 SSH 접속    | 기본 `.pem` 키                     | 설치 때 만든 비밀번호로 처음 한 번 접속 → §5-2처럼 공개 키를 등록한 뒤 §7이 비밀번호 로그인을 막는다            |
| 방화벽           | 콘솔 방화벽 + ufw                  | ufw만 (콘솔 방화벽 없음)                                                                                        |
| 인증서·접속 주소 | 공인 IP → sslip.io → Let's Encrypt | **공인 IP가 없어 Let's Encrypt 발급이 안 된다.** HTTPS 확인과 `deploy.sh`의 헬스 체크는 VM에서 통과하지 못한다  |

따라 해 볼 수 있는 범위: SSH 키 만들기·등록(§4~§5), 서버용 배포 키·GitHub 등록·clone(§6), `server-setup.sh`(§7), `init-env.sh`·nano(§10), 크론(§14), 백업 키 생성(§13.3). 공인 IP·R2·Gmail이 필요한 §8, §9, §11의 접속 확인은 실제 계정이 있어야 한다.

처음 VM을 배울 때는 **스냅샷을 먼저 찍어 두면** `server-setup.sh`나 SSH 강화에서 막혀도 되돌릴 수 있다.

## 17. 갱신과 되돌리기

```bash
cd /srv/field-note
./deploy/scripts/deploy.sh v1.0.1        # 배포 전 백업 → 코드 맞추기 → 빌드 → 마이그레이션 → 시작 → 헬스 체크
./deploy/scripts/deploy.sh v1.0.0        # 되돌리기: 이전 태그로 같은 명령
```

- main에 머지해도 서버는 자동으로 바뀌지 않는다. 서버에서 `deploy.sh <태그>`를 직접 실행해야 반영된다 (자동 배포는 서버 접속 키를 GitHub에 맡기는 위험이 있어 하지 않았다)
- 이미 적용된 마이그레이션은 **되돌려지지 않는다.** 새 마이그레이션이 들어간 배포를 되돌릴 때 앱이 새 구조에서 동작하지 않으면 배포 직전 백업(`deploy/backups/`의 `predeploy-backup`)으로 복구한다
- 점검: 매주 `deploy/logs/drill.log` 또는 알림 메일 확인, 월 1회 `server-check.sh`, 재부팅 필요 알림이 있으면 `sudo reboot` 후 `fnc ps`로 컨테이너 복귀 확인 (`restart: unless-stopped`)

## 18. 운영자가 DB를 볼 때

DB 포트(5432)는 `127.0.0.1`(서버 안)에만 묶여 있어 바깥에서는 닿지 않는다. 방법은 두 가지다.

**1) 서버에서 직접 (소유 계정, 모든 회사가 보임)**

```bash
fnc exec db psql -U field_note field_note
```

**2) 내 PC의 DB 도구(WebStorm·DBeaver)에서 SSH 터널로 (조회 전용 계정)**

```bash
# 🖥 내 PC: 로컬 15432 → 서버 안의 5432 (터널을 열어 둔 동안 유지)
ssh -N -L 15432:127.0.0.1:5432 field-note
```

DB 도구의 접속 정보: 호스트 `localhost`, 포트 `15432`, 데이터베이스 `field_note`, 사용자 `field_note_readonly`, 비밀번호는 서버 `deploy/ops.env`의 `DATABASE_READONLY_URL` 안(`field_note_readonly:`와 `@db` 사이)에 있다. 화면에 찍지 말고 비밀번호 관리자에 옮겨 둔다.

- 조회 전용 계정은 **SELECT만** 가능하고 회사 격리(RLS)가 앱과 같다. 접속 직후에는 어떤 행도 보이지 않으므로 볼 회사를 지정한다 (세션마다 한 번)

  ```sql
  SELECT set_config('app.company_id', '<회사 ID>', false);
  SELECT * FROM projects;
  ```

  회사 ID는 `list-companies`로 확인한다. 세션·비밀번호 해시·2단계 인증·초대·인증 코드·소셜 연동·운영자 기록 테이블은 접근할 수 없다

- 이미 운영 중인 서버(1.0.0)의 `ops.env`에는 `DATABASE_READONLY_URL`이 없으므로 1.0.1 배포 **전에** 한 번 추가한다 (없어도 배포는 되지만 이 계정이 로그인할 수 없는 상태로 남는다)

  ```bash
  printf 'DATABASE_READONLY_URL=postgresql://field_note_readonly:%s@db:5432/field_note\n' "$(openssl rand -base64 24 | tr -d '\n=' | tr '+/' '-_')" >> deploy/ops.env
  ```

  그다음 `deploy.sh`를 실행하면 마이그레이션 단계가 계정과 비밀번호를 만든다

## 19. 문제가 생겼을 때

| 증상                                                            | 원인·해결                                                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `git clone`이 `Permission denied (publickey)`                   | `sudo`로 실행했거나 `~/.ssh/config`의 `IdentityFile`이 틀림. 일반 계정으로 `ssh -T git@github.com`부터 확인 (§6)                    |
| 서버 창에서 `Get-ChildItem` 등이 안 됨                          | 서버는 bash다. 프롬프트가 `ubuntu@…`인지 `PS`인지 확인                                                                              |
| R2 업로드가 401                                                 | Access Key ID 칸에 계정 ID를 넣었거나 비밀 키 오타. 둘 다 32자 hex라 헷갈린다                                                       |
| 브라우저에서 사진 올리기만 실패                                 | R2 CORS의 허용 출처가 접속 주소와 다름 (§8-4)                                                                                       |
| `mail:check` 실패                                               | 앱 비밀번호 공백·오타, 2단계 인증 꺼짐, `SMTP_USER`≠`SMTP_FROM`                                                                     |
| 인증서 발급 실패                                                | 80·443이 막힘(콘솔 방화벽·ufw), `SITE_ADDRESS`의 IP가 서버 IP와 다름, 발급 횟수 제한                                                |
| 백업이 조용히 안 돈다                                           | `deploy/logs`가 루트 소유라 크론이 로그를 못 씀. `sudo chown -R $USER deploy/logs` (현재 스크립트는 오류로 끝나고 알림 메일을 보냄) |
| `docker`가 `permission denied`                                  | docker 그룹 적용 전. 로그아웃 후 다시 접속                                                                                          |
| 배포 후 pnpm `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` 경고 | 알려진 무해한 경고 (`docs/12-next-version-plan.md` 1.0.1에서 정리 예정)                                                             |

## 20. 아직 확정되지 않은 것

- 도메인 (지금은 sslip.io): 소셜 로그인 앱 등록과 메일 신뢰도를 위해 후속 검토
- 메일: Gmail 한도·발신자 표시 문제가 생기면 전문 메일 서비스(도메인 필요)로 이동
- 서버 사양: 사용량을 보고 `deploy/.env`의 자원 한도(`DB_MEM_LIMIT`, `API_MEM_LIMIT` 등) 조정
- 단일 서버 장애 대비: 서버를 잃으면 서버 밖 백업과 **서버 밖에 보관한 백업 키**로 새 서버에 복구
