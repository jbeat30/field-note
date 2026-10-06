import {
  getLegalDocumentContent,
  type LegalBlock,
  type LegalDocumentType,
} from '@field-note/shared';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';

const SLUG_TO_TYPE: Record<string, LegalDocumentType> = {
  terms: 'TERMS_OF_SERVICE',
  privacy: 'PRIVACY_POLICY',
  marketing: 'MARKETING',
};

const Block = ({ block }: { block: LegalBlock }) => {
  if (block.type === 'paragraph') {
    return <p className="text-sm leading-relaxed">{block.text}</p>;
  }

  if (block.type === 'list') {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  // 모바일에서 표가 넘치면 가로로 스크롤
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="border border-border bg-muted px-2 py-1.5 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => (
                <td key={`${index}-${cell}`} className="border border-border px-2 py-1.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 약관·개인정보 처리방침 전문 (로그인·가입 화면과 설정 하단에서 항상 볼 수 있음, §5.7)
export const LegalPage = () => {
  const { slug = '' } = useParams();
  const type = SLUG_TO_TYPE[slug];

  if (!type) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">문서를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </section>
    );
  }

  const content = getLegalDocumentContent(type);

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{content.title}</h1>
        <p className="text-sm text-foreground/70">
          버전 {content.version} · {content.isRequired ? '필수' : '선택'}
        </p>
      </header>
      <Alert variant="info">
        <p className="font-medium">초안입니다</p>
        <p className="mt-1">
          이 문서는 서비스 공개 전에 전문가 검토를 거쳐 확정합니다. 아래 항목은 확정 후 채워집니다.
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {content.pendingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Alert>
      {content.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="text-base font-bold">{section.heading}</h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
      <nav aria-label="다른 문서" className="flex flex-wrap gap-x-4 border-t border-border pt-3">
        {Object.entries(SLUG_TO_TYPE).map(([itemSlug, itemType]) => (
          <Link
            key={itemSlug}
            className="min-h-touch content-center text-sm text-primary underline"
            to={`/legal/${itemSlug}`}
          >
            {getLegalDocumentContent(itemType).title}
          </Link>
        ))}
        <Link className="min-h-touch content-center text-sm text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </nav>
    </article>
  );
};
