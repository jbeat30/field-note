# 서버 배포 순서 (Oracle Cloud 무료 VM 한 대)

> 대상: 서버 실환경 시험(1.0.0 전)과 1.0.0 첫 배포. 구성 설명은 `docs/10-deployment-prep.md` §5.3, 백업·복구는 `docs/05-backup-restore.md`
> 서버 안의 명령은 사용자가 SSH로 접속해 직접 실행한다. **접속 키·비밀번호·R2 키·Gmail 앱 비밀번호는 채팅·저장소·메신저에 붙여 넣지 않는다.** 값은 서버의 `deploy/.env`와 `deploy/ops.env`에만 둔다
> 가입 화면(Oracle·Cloudflare·Google)의 메뉴 이름은 바뀔 수 있다. 아래는 작성 시점의 일반적인 흐름이며, 화면이 다르면 같은 뜻의 항목을 찾아 진행한다
> 서버는 Oracle Cloud 무료 VM을 기준으로 썼지만 같은 구성이 AWS Lightsail 같은 일반 VPS(Ubuntu 24.04, 메모리 2GB 이상)에서도 동작한다. §3은 Oracle 기준 절차이고 다른 업체는 같은 뜻의 항목(고정 IP, 방화벽 22·80·443)으로 바꿔 진행한다. 메모리가 작은 서버(2GB)는 `deploy/.env`의 자원 한도(`DB_MEM_LIMIT`, `DB_SHARED_BUFFERS`, `API_MEM_LIMIT`, `API_HEAP_MB`, `WEB_MEM_LIMIT`)를 줄여 쓰고 `server-setup.sh`가 스왑을 만든다

## 1. 전체 순서

| 단계 | 하는 일                                                | 누가                                  |
| ---- | ------------------------------------------------------ | ------------------------------------- |
| 1    | Oracle Cloud 가입, VM 생성, 고정 IP, 방화벽(보안 목록) | 사용자                                |
| 2    | SSH 접속, 저장소 내려받기, 서버 설정 스크립트 실행     | 사용자 (명령은 이 문서에서 복사)      |
| 3    | Cloudflare R2: 버킷 2개, CORS, 접근 키, 백업 보호      | 사용자                                |
| 4    | 서비스용 Gmail과 앱 비밀번호                           | 사용자                                |
| 5    | `deploy/.env`·`ops.env` 만들고 값 채우기               | 사용자                                |
| 6    | 메일·서버 밖 백업 저장소 접속 확인                     | 사용자 (결과의 비밀 아닌 부분만 공유) |
| 7    | 첫 배포, 첫 회사 만들기                                | 사용자                                |
| 8    | 점검 작업 크론 등록, 서버 점검 스크립트                | 사용자                                |
| 9    | 실제 환경 동작 시험(§9 체크리스트)                     | 사용자와 함께                         |

## 2. 가입할 때 쓸 이름 추천

이름은 나중에 바꾸기 어려운 것(리전·버킷 이름)만 신경 쓰면 된다. 아래 값을 그대로 써도 되고, 바꾸면 이 문서의 해당 부분도 같은 값으로 읽는다.

| 항목                           | 추천 값                                             | 비고                                                                                   |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Oracle 리전(홈 리전)           | **South Korea Central (Seoul)**                     | 가입할 때 정하면 **나중에 바꿀 수 없다**. 무료 자원은 홈 리전에서만 만들 수 있다       |
| VM 이름                        | `field-note-prod`                                   | 스테이징으로 따로 만든다면 `field-note-stg`                                            |
| VM 사양                        | `VM.Standard.A1.Flex` 2 OCPU · 12GB, 부트 볼륨 50GB | 무료 한도는 4 OCPU·24GB 합계. 자원이 부족하다고 나오면 시간을 두고 다시 시도 (§3 참고) |
| OS 이미지                      | **Ubuntu 24.04** (aarch64)                          | 컨테이너 이미지는 서버에서 직접 빌드하므로 ARM이어도 된다                              |
| 가상 네트워크                  | `field-note-vcn`                                    | 생성 마법사가 만드는 기본 이름을 써도 된다                                             |
| SSH 키 파일                    | `field-note-prod.key` (Oracle이 만들어 줌)          | 내려받은 파일은 비밀번호 관리자 또는 본인만 읽는 폴더에 보관                           |
| Cloudflare R2 버킷 (사진·문서) | `field-note-files-prod`                             | 소문자·숫자·하이픈. 스테이징이면 `-stg`                                                |
| Cloudflare R2 버킷 (백업)      | `field-note-backup-prod`                            | **위 버킷과 별개**                                                                     |
| R2 접근 키 이름 (사진·문서)    | `field-note-files-rw`                               | 권한: 이 버킷만, Object Read & Write                                                   |
| R2 접근 키 이름 (백업)         | `field-note-backup-rw`                              | 권한: 백업 버킷만, Object Read & Write                                                 |
| R2 위치 힌트                   | Asia-Pacific (APAC)                                 | 버킷을 만들 때 선택                                                                    |
| 서비스 Gmail 주소              | `fieldnote.service.<본인만 아는 숫자>@gmail.com`    | 짧은 이름은 이미 쓰이는 경우가 많다. 표시 이름은 `필드노트`                            |
| Gmail 앱 비밀번호 이름         | `field-note-server`                                 | 16자 비밀번호는 발급 화면에서 한 번만 보이므로 바로 서버 파일에 넣는다                 |
| 접속 주소                      | `<서버IP의 점을 하이픈으로>.sslip.io`               | 예: IP가 `203.0.113.10`이면 `203-0-113-10.sslip.io`. 도메인을 마련하면 그때 교체       |
| 알림 받을 메일                 | 본인이 매일 보는 개인 메일                          | 점검 작업이 실패하면 여기로 온다                                                       |

## 3. Oracle Cloud: 가입과 VM

1. Oracle Cloud Free Tier에 가입한다. 카드 확인(소액 승인 후 취소)이 있을 수 있다. **홈 리전은 Seoul**로 고른다
2. 콘솔의 Compute → Instances → Create instance
   - 이름 `field-note-prod`, 이미지 Ubuntu 24.04, 사양 `VM.Standard.A1.Flex` 2 OCPU·12GB, 부트 볼륨 50GB
   - 네트워킹은 새 VCN과 공용 서브넷, **공용 IPv4 주소 할당**을 켠다
   - SSH 키는 "키 쌍 생성"을 골라 **개인 키를 내려받아** 보관한다 (잃으면 서버에 들어갈 수 없다)
3. `Out of host capacity` 오류가 나면 무료 ARM 자원이 일시적으로 없는 것이다. 몇 시간~며칠 뒤 다시 시도하거나 사양을 1 OCPU·6GB로 낮춰 본다. 계속 막히면 `DEPLOY-DECISIONS` 대안(월 $5~6 일반 VPS)으로 같은 구성을 옮긴다. 무료 AMD 소형(메모리 1GB)은 DB·API·빌드를 함께 돌리기에 작아 권하지 않는다
4. **고정 IP**: Networking → Reserved public IPs에서 예약 IP를 만들어 VM에 붙인다 (임시 IP는 VM을 멈췄다 켜면 바뀔 수 있고, 접속 주소와 인증서가 IP에 묶여 있다)
5. **클라우드 방화벽**: VCN → 보안 목록(Security List)의 Ingress 규칙에서 아래만 연다. 나머지는 열지 않는다

   | 포트 | 프로토콜 | 허용 대상                                                                               |
   | ---- | -------- | --------------------------------------------------------------------------------------- |
   | 22   | TCP      | **내 IP/32만** (집·사무실 고정 IP가 없다면 0.0.0.0/0으로 두되 SSH 강화·fail2ban에 의존) |
   | 80   | TCP      | 0.0.0.0/0 (인증서 발급과 https 전환)                                                    |
   | 443  | TCP·UDP  | 0.0.0.0/0                                                                               |

6. 무료 VM은 오랫동안 거의 쓰지 않으면 회수될 수 있다는 정책이 있다. 서비스를 상시 돌리면 해당되지 않지만 가입 조건을 한 번 읽어 둔다

## 4. 서버 접속과 기본 설정

Windows PowerShell에서 (키 파일 경로는 본인 것으로 바꾼다):

```powershell
# 키 파일을 본인만 읽을 수 있게 (처음 한 번)
icacls "$HOME\.ssh\field-note-prod.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"
ssh -i "$HOME\.ssh\field-note-prod.key" ubuntu@<서버 공인 IP>
```

서버에 접속한 뒤:

```bash
sudo apt-get update && sudo apt-get install -y git
sudo git clone https://github.com/jbeat30/field-note.git /srv/field-note
sudo chown -R "$USER":"$USER" /srv/field-note
cd /srv/field-note
git checkout --detach <배포할 태그 또는 브랜치>     # 예: feature/0.12.0 (스테이징), v1.0.0 (운영)

# 시간대·Docker·자동 보안 업데이트·fail2ban·SSH 강화·방화벽·스왑 설정 (한 번만)
sudo ./deploy/scripts/server-setup.sh
```

- 저장소가 비공개라면 `git clone` 전에 읽기 전용 배포 키나 토큰이 필요하다 (값은 서버에만 둔다)
- 스크립트는 현재 계정에 SSH 접속 키(`~/.ssh/authorized_keys`)가 있을 때만 비밀번호·루트 로그인을 막는다. 접속이 끊기지 않게 **새 터미널에서 접속이 되는지 확인한 뒤** 기존 연결을 닫는다
- `docker` 그룹에 추가한 계정은 **한 번 로그아웃했다가 다시 접속**해야 `sudo` 없이 docker를 쓸 수 있다
- Oracle Ubuntu 이미지에는 기본 방화벽 규칙(iptables)이 이미 있다. 스크립트가 ufw를 더하는 것으로 80·443 접속이 막힌다면 `--skip-firewall`로 다시 실행하고 클라우드 보안 목록(§3-5)을 기준으로 삼는다. Docker가 공개한 포트는 ufw를 거치지 않으므로 컨테이너가 공개하는 포트는 compose 파일의 80·443뿐이어야 한다 (`deploy/scripts/server-check.sh`가 확인)

## 5. Cloudflare R2: 버킷·CORS·접근 키·백업 보호

1. Cloudflare에 가입하고(카드 등록이 필요할 수 있다) R2 Object Storage를 켠다. 무료 구간은 저장 10GB까지이며 넘으면 과금되므로 사용량 알림을 설정해 둔다
2. 버킷 2개를 만든다 (§2 이름, 위치 힌트 APAC): `field-note-files-prod`, `field-note-backup-prod`. **공개 접근(Public access)은 켜지 않는다**
3. **엔드포인트 확인**: R2 개요 화면의 계정 ID로 `https://<계정 ID>.r2.cloudflarestorage.com`이 S3 엔드포인트가 된다 (`S3_ENDPOINT`·`BACKUP_S3_ENDPOINT`)
4. **사진·문서 버킷의 CORS**: 버킷 → Settings → CORS Policy에 아래를 넣는다. `AllowedOrigins`는 접속 주소(`https://<SITE_ADDRESS>`)와 정확히 같아야 한다. 틀리면 사진·문서 올리기가 브라우저에서 막힌다

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

5. **접근 키 2개**: R2 → Manage API tokens → Create API token (계정 전체가 아니라 **버킷을 지정**한다)
   - `field-note-files-rw`: 권한 Object Read & Write, 대상 `field-note-files-prod`만
   - `field-note-backup-rw`: 권한 Object Read & Write, 대상 `field-note-backup-prod`만
   - 발급 화면의 Access Key ID와 Secret Access Key는 **그 화면에서만 볼 수 있다**. 바로 서버 파일에 넣고 어디에도 붙여 넣지 않는다
6. **백업 버킷 보호** (R2에는 쓰기 전용 키가 없어 서버가 뚫려도 사본이 지워지지 않게 다음으로 막는다. `docs/10` 참고)
   - 버킷 잠금(Bucket Lock): 보존 기간 **14일** (올린 뒤 14일 동안 삭제·덮어쓰기 불가)
   - 수명 주기 규칙(Object lifecycle): **30일** 지난 객체 삭제 (서버 키로 지우지 않고 R2가 알아서)
7. 두 접근 키는 서로 다른 버킷만 가리키므로 한쪽이 유출돼도 다른 쪽에 접근할 수 없다. 백업은 암호화돼 있어 읽혀도 내용을 알 수 없다

## 6. 서비스용 Gmail

1. 새 Google 계정을 만든다 (§2 이름, 표시 이름 `필드노트`). 개인 계정과 분리해 비밀번호 관리자에 저장한다
2. 계정 → 보안 → **2단계 인증**을 켠다 (앱 비밀번호의 전제)
3. 계정 → 보안 → 2단계 인증 → **앱 비밀번호**에서 이름 `field-note-server`로 발급한다. 16자리가 한 번만 보이므로 바로 `deploy/.env`의 `SMTP_PASSWORD`에 넣는다 (공백은 빼고)
4. 한도와 동작: 하루 약 500통, 받는 사람에게는 이 Gmail 주소가 보낸 사람으로 보인다. `SMTP_FROM`은 로그인 계정과 **같은 주소**로 둔다 (다르면 Gmail이 로그인 계정 주소로 바꿔 보낸다). 메일이 스팸함으로 갈 수 있으니 첫 시험에서 스팸함도 본다
5. 가입자가 늘거나 도메인을 마련하면 전문 메일 서비스로 옮긴다 (`docs/10` 참고)

## 7. 환경 변수 파일

```bash
cd /srv/field-note
./deploy/scripts/init-env.sh        # 비밀 값을 새로 만들어 deploy/.env, deploy/ops.env 생성 (권한 600)
nano deploy/.env                    # <꺾쇠> 값 채우기
nano deploy/ops.env
```

| 파일             | 채울 값                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy/.env`    | `SITE_ADDRESS`(§2), `S3_ENDPOINT`·`S3_BUCKET`(`field-note-files-prod`)·`S3_ACCESS_KEY`·`S3_SECRET_KEY`, `SMTP_USER`·`SMTP_PASSWORD`·`SMTP_FROM` |
| `deploy/ops.env` | `ALERT_MAIL_TO`, `BACKUP_S3_ENDPOINT`·`BACKUP_S3_BUCKET`(`field-note-backup-prod`)·`BACKUP_S3_ACCESS_KEY`·`BACKUP_S3_SECRET_KEY`                |

- 꺾쇠(`<…>`)가 남아 있으면 `deploy.sh`가 멈추고 어느 항목인지 알려 준다
- **`BACKUP_ENCRYPTION_KEY`를 서버 밖(비밀번호 관리자 등)에도 따로 보관한다.** 잃으면 백업을 풀 수 없다 (`grep BACKUP_ENCRYPTION_KEY deploy/ops.env`로 한 번 보고 옮겨 적고, 화면 기록·채팅에는 남기지 않는다)
- 소셜 로그인은 앱 등록 뒤에 `deploy/.env`의 주석을 풀어 채운다 (리다이렉트 주소는 `https://<SITE_ADDRESS>/api/v1/auth/{kakao|naver|google}/callback`). IP가 바뀌면 다시 등록해야 하므로 고정 IP가 필요하다

## 8. 접속 확인 → 첫 배포

배포 전에 메일·서버 밖 저장소가 붙는지 먼저 확인한다 (이미지 빌드가 필요하므로 첫 확인은 배포와 함께 한다).

```bash
cd /srv/field-note
./deploy/scripts/deploy.sh                  # 이미지 빌드(ARM 서버에서는 10~20분) → DB → 마이그레이션 → api·웹 → 헬스 체크
```

배포가 끝나면 접속 확인:

```bash
C="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
$C run --rm ops pnpm mail:check 본인메일@example.com      # 연결·TLS·로그인 + 확인 메일 한 통 (스팸함도 확인)
$C run --rm ops pnpm backup remote-check                  # 백업 버킷에 확인용 파일을 올리고 확인
```

- `mail:check`가 실패하면: 앱 비밀번호 공백·오타, 2단계 인증 여부, `SMTP_USER`와 `SMTP_FROM` 일치를 먼저 본다
- `remote-check`가 실패하면: 엔드포인트의 계정 ID, 버킷 이름, 접근 키가 **백업 버킷용**인지 본다
- 인증서 발급이 안 되면 80·443이 열렸는지(클라우드 보안 목록 + `server-check.sh`), `SITE_ADDRESS`의 IP가 서버 공인 IP인지 본다. sslip.io는 많은 사람이 공유하는 주소라 발급 횟수 제한에 걸릴 수 있어 Caddy가 다른 발급 기관으로 자동 전환한다. 계속 실패하면 몇 시간 뒤 다시 시도하거나 도메인을 마련한다

첫 회사와 관리자 초대 링크를 만든다 (운영자 CLI):

```bash
$C run --rm ops pnpm operator create-company --company "회사 이름" --admin "관리자 이름"
$C run --rm ops pnpm operator legal-register          # 약관·처리방침을 DB에 등록 (처음 한 번, 갱신 때도)
```

출력된 초대 링크를 관리자에게 전달해 가입한다. 링크는 7일간 유효하며 `reissue`로 다시 발급한다.

공개 시연 환경(선택): 가상 데이터만 담은 `Test Company`를 두고 로그인 화면에 시연 계정을 안내한다 (상세는 `docs/07-feature-reference.md`의 "공개 시연 환경").

```bash
# deploy/.env에 PUBLIC_DEMO_ENABLED=true (env.example에 이미 있음), 바꿨다면 api를 다시 시작한다
$C up -d api
$C run --rm ops pnpm operator legal-register          # 약관이 먼저 등록돼 있어야 함 (위에서 했다면 생략)
$C run --rm ops pnpm operator demo-reset              # 시연 회사 생성 또는 처음 상태로 되돌리기 (몇 초~1분)
```

- 시연 회사는 방문자가 바꾼 내용·올린 파일이 쌓이므로 크론(§9)이 매일 04:30에 되돌린다. 시연 계정으로 로그인할 때 해지·비밀번호·이메일·2단계 인증·소셜 연동·기기 목록은 막혀 있다
- 시연 환경을 끄는 서비스 단계에서는 `PUBLIC_DEMO_ENABLED=false`, 크론 줄 삭제, `$C run --rm ops pnpm operator demo-remove` 순서로 정리한다

## 9. 점검 작업 크론과 서버 점검

```bash
crontab -e      # ops/crontab.example 내용을 붙여 넣는다 (저장소 위치가 /srv/field-note가 아니면 경로를 바꾼다)
./deploy/scripts/run-ops.sh backup pnpm backup create       # 크론을 기다리지 않고 한 번 실행해 확인
./deploy/scripts/run-ops.sh drill pnpm backup drill
sudo ./deploy/scripts/server-check.sh                       # 열린 포트·SSH·방화벽·컨테이너·백업 점검
```

- 백업은 매일 03:00(암호화·서버 밖 사본), 해지 회사 삭제는 03:30, 복구 시험은 월요일 04:00, 시연 회사 초기화는 매일 04:30에 돈다. 결과는 `deploy/logs/*.log`, 실패하면 `ALERT_MAIL_TO`로 메일이 온다
- 알림 메일이 오는지 확인하려면 일부러 실패시킨다: `./deploy/scripts/run-ops.sh alert-test false` (종료 코드 1로 끝나며 알림 메일이 와야 한다)

**실제 환경 동작 시험 체크리스트** (1.0.0 첫 배포 전에 모두 통과해야 한다. 0.12.0 릴리즈 때는 서버가 없어 이월했다, 상세는 `docs/10` §4.2)

- [ ] `https://<SITE_ADDRESS>`가 열리고 인증서가 유효하다, `http://`는 https로 넘어간다
- [ ] 브라우저 개발자 도구에서 CSP 위반이 없다 (콘솔), 응답 헤더에 HSTS·CSP·nosniff·`Referrer-Policy: no-referrer`
- [ ] 초대 링크로 가입 → 이메일 인증 코드 메일 도착 → 로그인 → 2단계 인증 켜고 끄기
- [ ] 비밀번호 재설정 메일 도착과 재설정
- [ ] 시연 환경(켠 경우): 로그인 화면에 시연 안내가 보이고 `tester`로 로그인된다, 설정 화면에서 막힌 구역이 숨겨진다, `demo-reset`이 약관 등록 뒤 오류 없이 끝나고 시연 회사에서 올린 사진이 초기화 뒤 사라진다 (R2에서 `company/<시연 회사 ID>/` 확인)
- [ ] 사진·문서 올리기와 내려받기, 썸네일 생성 (R2 CORS·CSP 확인)
- [ ] 두 곳(예: 사무실과 휴대폰 데이터)에서 접속해 한쪽의 로그인 실패가 다른 쪽을 막지 않고, 기기 목록에 실제 IP가 보인다
- [ ] 회사 간 격리 외부 점검: 두 회사 계정으로 `node scripts/isolation-probe.mjs` 종료 코드 0 (`docs/10` §4.2)
- [ ] 월 공수 엑셀·회사 전체 데이터 내려받기가 제한 시간 안에 끝난다
- [ ] 백업 생성 → 서버 밖 버킷에 사본 → 복구 시험 통과, 백업 키로 `decrypt` 시험
- [ ] `server-check.sh` 모두 통과
- [x] 처리방침·약관의 보호책임자·수탁·위탁·국외 이전을 채우고 버전을 올렸다 (2026-10-20판, 수탁은 AWS 서울 리전(서버), Cloudflare(R2), Google(메일)). 서버에서 `operator legal-register`로 이 판을 등록한다

## 10. 갱신과 되돌리기

```bash
cd /srv/field-note
./deploy/scripts/deploy.sh v1.0.1        # 배포 전 백업 → 코드 맞추기 → 빌드 → 마이그레이션 → 시작 → 헬스 체크
./deploy/scripts/deploy.sh v1.0.0        # 되돌리기: 이전 태그로 같은 명령
```

- 이미 적용된 마이그레이션은 **되돌려지지 않는다.** 새 마이그레이션이 들어간 배포를 되돌릴 때 앱이 새 구조에서 동작하지 않으면 배포 직전 백업으로 복구한다 (`docs/05-backup-restore.md`, `deploy/backups/`에 `predeploy-backup`이 만든 최신 백업)
- 마이그레이션 파일은 고치지 않고 문제가 있으면 새 마이그레이션으로 고친다
- 점검: 매주 `deploy/logs/drill.log` 확인 또는 알림 메일 확인, 월 1회 `server-check.sh`, 재부팅 필요 알림이 있으면 `sudo reboot` 후 `docker compose ... ps`로 컨테이너 복귀 확인 (`restart: unless-stopped`)

## 11. 운영자가 DB를 볼 때

DB 포트는 어디에도 공개되지 않는다. 서버에 SSH로 접속해 컨테이너 안에서 본다.

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec db psql -U field_note field_note
```

내 PC에서 접속 도구(DBeaver 등)를 쓰려면 SSH 터널을 쓰되, DB 포트를 서버 호스트에 열지 않으므로 터널 대상은 컨테이너 IP가 된다. 지금 규모에서는 위 `psql`로 충분하고, 필요해지면 `127.0.0.1`에만 묶는 포트 연결을 별도로 추가한다.

## 12. 아직 확정되지 않은 것

- 도메인 (지금은 sslip.io): 소셜 로그인 앱 등록과 메일 신뢰도를 위해 1.0.0 전에 다시 검토
- 메일: Gmail 한도·발신자 표시 문제가 생기면 전문 메일 서비스(도메인 필요)로 이동
- 서버 사양: 사용량을 보고 `deploy/.env`의 자원 한도 조정
- 단일 서버 장애 대비: 서버를 잃으면 서버 밖 백업과 백업 키로 새 서버에 복구 (`docs/05-backup-restore.md`)
