#!/usr/bin/env bash
# 서버를 처음 받았을 때 한 번 실행하는 설정 (Ubuntu 22.04·24.04, 여러 번 실행해도 같은 결과)
#   sudo ./deploy/scripts/server-setup.sh [--skip-ssh-hardening] [--skip-firewall]
# 하는 일: 시간대, Docker, 자동 보안 업데이트, fail2ban, SSH 강화, 방화벽(ufw), 작은 서버용 스왑, 점검 작업 폴더와 로그 정리
# 접속 키·비밀번호는 다루지 않는다. SSH 강화는 현재 계정에 접속 키가 등록돼 있을 때만 적용해 접속이 막히지 않게 한다
set -euo pipefail

SKIP_SSH=0
SKIP_FIREWALL=0

for arg in "$@"; do
  case "$arg" in
    --skip-ssh-hardening) SKIP_SSH=1 ;;
    --skip-firewall) SKIP_FIREWALL=1 ;;
    *) echo "알 수 없는 옵션: $arg" >&2; exit 2 ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo로 실행해 주세요" >&2
  exit 1
fi

# shellcheck source=/dev/null
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ] && [ "${ID:-}" != "debian" ]; then
  echo "Ubuntu·Debian만 지원합니다 (현재 ${ID:-알 수 없음})" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_USER="${SUDO_USER:-}"
log() { echo "[server-setup] $*"; }

export DEBIAN_FRONTEND=noninteractive

log "기본 도구 설치"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg openssl ufw fail2ban unattended-upgrades logrotate >/dev/null

log "시간대를 Asia/Seoul로 (점검 작업 크론이 서버 시간 기준)"
timedatectl set-timezone Asia/Seoul

# ---- Docker (공식 저장소)
if ! command -v docker >/dev/null 2>&1; then
  log "Docker 설치"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
else
  log "Docker가 이미 있음"
fi

# 컨테이너 로그가 디스크를 채우지 않게 기본값을 정하고, Docker가 재시작돼도 컨테이너를 유지
if [ ! -f /etc/docker/daemon.json ]; then
  cat >/etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true
}
JSON
  systemctl restart docker
fi
systemctl enable --now docker >/dev/null 2>&1

if [ -n "$TARGET_USER" ] && id "$TARGET_USER" >/dev/null 2>&1; then
  usermod -aG docker "$TARGET_USER"
  log "$TARGET_USER 계정을 docker 그룹에 추가 (다시 로그인해야 적용)"
fi

# ---- 자동 보안 업데이트 (재부팅은 하지 않음: 필요하면 /var/run/reboot-required가 생김)
log "자동 보안 업데이트 켜기"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF
cat >/etc/apt/apt.conf.d/52field-note-unattended <<'CONF'
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
CONF

# ---- fail2ban: SSH 로그인 실패가 반복되는 주소를 1시간 차단
log "fail2ban 설정"
cat >/etc/fail2ban/jail.d/field-note.local <<'CONF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
backend = systemd
CONF
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban

# ---- SSH 강화: 비밀번호 로그인과 루트 로그인 금지 (접속 키가 있을 때만)
if [ "$SKIP_SSH" -eq 0 ]; then
  KEYS_FILE=""
  if [ -n "$TARGET_USER" ]; then
    KEYS_FILE="$(getent passwd "$TARGET_USER" | cut -d: -f6)/.ssh/authorized_keys"
  fi

  if [ -n "$KEYS_FILE" ] && [ -s "$KEYS_FILE" ]; then
    log "SSH 강화 (비밀번호·루트 로그인 금지)"
    install -d -m 0755 /etc/ssh/sshd_config.d
    cat >/etc/ssh/sshd_config.d/99-field-note.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
CONF
    # 설정이 틀렸다면 적용하지 않고 되돌림 (접속이 끊기는 일을 막음)
    if sshd -t; then
      systemctl reload ssh 2>/dev/null || systemctl reload sshd
    else
      rm -f /etc/ssh/sshd_config.d/99-field-note.conf
      log "SSH 설정 검사에 실패해 적용하지 않음"
    fi
  else
    log "접속 키(~/.ssh/authorized_keys)가 없어 SSH 강화를 건너뜀 (키를 등록한 뒤 다시 실행)"
  fi
fi

# ---- 방화벽(ufw): 22·80·443만 허용
# Docker가 공개한 포트는 ufw를 거치지 않으므로, 컨테이너 포트는 compose 파일이 공개하는 80·443만으로 제한해 둔다 (DB는 공개하지 않음)
if [ "$SKIP_FIREWALL" -eq 0 ]; then
  log "방화벽 설정"
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw limit 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
fi

# ---- 작은 서버(메모리 3GB 미만)는 스왑 2GB (빌드 중 메모리 부족 방지)
MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
if [ "$MEM_KB" -lt 3000000 ] && [ "$(swapon --show --noheadings | wc -l)" -eq 0 ]; then
  log "메모리가 작아 스왑 2GB 만들기"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# ---- 점검 작업 폴더: ops 컨테이너의 node 사용자(uid 1000)가 쓸 수 있어야 함
log "백업·로그 폴더 준비"
install -d -o 1000 -g 1000 -m 0700 "$ROOT/deploy/backups"
install -d -m 0755 "$ROOT/deploy/logs"
cat >/etc/logrotate.d/field-note <<CONF
$ROOT/deploy/logs/*.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
  copytruncate
}
CONF

log "완료. 다음: deploy/.env·ops.env 준비(pnpm env:init --production) 후 deploy/scripts/deploy.sh"
if [ -f /var/run/reboot-required ]; then
  log "재부팅이 필요한 업데이트가 있습니다 (sudo reboot)"
fi
