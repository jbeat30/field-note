import type { LegalBlock, LegalDocumentContent } from '@field-note/shared';

import { Alert } from '../components/ui/alert';

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

type LegalDocumentBodyProps = {
  content: LegalDocumentContent;
  // 창 제목이 이미 문서 제목을 보여 주는 곳(모달)은 본문의 제목을 생략
  showTitle?: boolean;
};

// 약관·처리방침 본문 (전문 화면과 가입 화면의 보기 창이 같은 모양을 씀)
export const LegalDocumentBody = ({ content, showTitle = true }: LegalDocumentBodyProps) => (
  <div className="flex flex-col gap-5">
    <header className="flex flex-col gap-1">
      {showTitle && <h1 className="text-xl font-bold">{content.title}</h1>}
      <p className="text-sm text-sub">
        버전 {content.version}, {content.isRequired ? '필수' : '선택'}
      </p>
    </header>
    <Alert variant="info">
      <p className="font-medium">초안입니다</p>
      <p className="mt-1">
        지인을 위한 초기(베타) 서비스 기준의 문서이며, 서비스를 개선하면서 바뀔 수 있습니다.
      </p>
    </Alert>
    {content.sections.map((section) => (
      <section key={section.heading} className="flex flex-col gap-2">
        <h2 className="text-base font-bold">{section.heading}</h2>
        {section.blocks.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </section>
    ))}
  </div>
);
