import { normalizePartnerName } from '@field-note/shared';

import type { PrismaClient } from './client';

let sequence = 0;

/**
 * @description 테스트용 프로젝트 한 건 (소유 계정으로 직접 입력). 프로젝트가 가리키는 고객·담당 직원도 같은 회사에 함께 만든다
 * @param owner 소유 계정 Prisma 클라이언트
 * @param companyId 회사 ID
 * @param name 프로젝트명
 * @returns 만든 프로젝트와 고객·담당 직원 ID
 */
export const createTestProject = async (owner: PrismaClient, companyId: string, name: string) => {
  sequence += 1;

  const clientName = `${name} 고객 ${sequence}`;
  const client = await owner.partner.create({
    data: {
      companyId,
      kind: 'CLIENT',
      name: clientName,
      nameKey: normalizePartnerName(clientName),
    },
  });
  const manager = await owner.employee.create({
    data: { companyId, name: `${name} 담당 ${sequence}` },
  });
  const project = await owner.project.create({
    data: {
      companyId,
      code: `2026-${String(sequence).padStart(3, '0')}`,
      name,
      siteName: `${name} 현장`,
      clientId: client.id,
      managerId: manager.id,
      contractDate: new Date('2026-09-01T00:00:00Z'),
      plannedStart: new Date('2026-10-01T00:00:00Z'),
      plannedEnd: new Date('2026-12-31T00:00:00Z'),
    },
  });

  return { project, clientId: client.id, managerId: manager.id };
};
