import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const publishedAt = new Date("2026-09-28T00:00:00.000Z");

const lessons = [
  ["io", "시작과 입출력", "main, cout, cin과 줄바꿈을 배웁니다."],
  ["variables", "변수와 자료형", "정수, 실수, 문자와 형 변환을 배웁니다."],
  ["conditions", "조건문", "if, else와 비교식을 배웁니다."],
  ["loops", "반복문", "for와 while을 이용한 반복을 배웁니다."],
  ["arrays", "배열과 문자열", "인덱스와 안전한 순회를 배웁니다."],
  ["stl", "STL 시작하기", "vector와 sort의 기본 사용법을 배웁니다."],
] as const;

const lessonCategories = [
  ["cpp-basics", "C++ 시작", "프로그램 구조와 기본 입출력, 자료형을 익힙니다."],
  [
    "control-flow",
    "흐름 제어",
    "조건과 반복으로 프로그램의 실행 흐름을 제어합니다.",
  ],
  [
    "arrays-strings",
    "배열과 문자열",
    "연속된 데이터를 저장하고 안전하게 순회합니다.",
  ],
  [
    "standard-library",
    "표준 라이브러리",
    "STL 컨테이너와 알고리즘의 기초를 익힙니다.",
  ],
] as const;

const lessonCategoryBySlug: Record<
  (typeof lessons)[number][0],
  (typeof lessonCategories)[number][0]
> = {
  io: "cpp-basics",
  variables: "cpp-basics",
  conditions: "control-flow",
  loops: "control-flow",
  arrays: "arrays-strings",
  stl: "standard-library",
};

const lessonBodies: Record<(typeof lessons)[number][0], string> = {
  io: `## 학습 목표

C++ 프로그램의 시작점인 \`main\` 함수와 표준 입출력을 이해합니다.

## 핵심 개념

\`#include <iostream>\`으로 입출력 기능을 가져옵니다. \`std::cin\`은 공백이나 줄바꿈을 기준으로 값을 읽고, \`std::cout\`은 값을 출력합니다. 여러 값을 이어 출력할 때는 \`<<\` 연산자를 사용합니다.

| 표현 | 역할 | 예시 |
| --- | --- | --- |
| \`std::cin >> 값\` | 표준 입력에서 값을 읽습니다. | \`std::cin >> number;\` |
| \`std::cout << 값\` | 표준 출력으로 값을 보냅니다. | \`std::cout << number;\` |
| \`'\\n'\` | 줄을 바꿉니다. | \`std::cout << '\\n';\` |

## 첫 프로그램

\`\`\`cpp
#include <iostream>

int main() {
    int number = 0;
    std::cin >> number;
    std::cout << "입력한 수: " << number << '\\n';
    return 0;
}
\`\`\`

:::tip
처음에는 \`using namespace std;\` 없이 \`std::\`를 직접 적으면 이름이 어디에서 왔는지 더 분명하게 익힐 수 있습니다.
:::

## 확인할 점

각 문장 끝의 세미콜론을 확인하고, 입력에는 \`>>\`, 출력에는 \`<<\`를 사용하세요.`,
  variables: `## 학습 목표

값의 종류와 범위에 맞는 자료형을 선택합니다.

## 핵심 개념

정수에는 \`int\`와 \`long long\`, 실수에는 \`double\`, 문자에는 \`char\`, 참과 거짓에는 \`bool\`을 사용할 수 있습니다. 계산 결과뿐 아니라 계산 중간값도 자료형의 범위 안에 있어야 합니다.

## 확인할 점

큰 정수의 합이나 곱을 계산할 때는 연산을 시작하기 전부터 \`long long\`을 사용하세요.`,
  conditions: `## 학습 목표

조건에 따라 서로 다른 코드를 실행하는 방법을 익힙니다.

## 핵심 개념

\`if\`는 조건이 참일 때 블록을 실행하고, \`else\`는 거짓일 때 실행합니다. 비교에는 \`==\`, \`!=\`, \`<\`, \`<=\` 등을 사용합니다. 나머지 연산자 \`%\`를 이용하면 홀수와 짝수를 구분할 수 있습니다.

## 확인할 점

\`=\`는 대입이고 \`==\`는 비교입니다. 두 연산자를 혼동하지 마세요.`,
  loops: `## 학습 목표

반복되는 작업을 \`for\`와 \`while\`로 표현합니다.

## 핵심 개념

\`for\`문은 초기화, 반복 조건, 증감식을 차례로 작성합니다. 반복 횟수가 정해져 있지 않다면 \`while\`문이 더 자연스러울 수 있습니다. 모든 반복문은 언젠가 조건이 거짓이 되도록 작성해야 합니다.

## 확인할 점

\`i < n\`과 \`i <= n\`은 반복 횟수가 다릅니다. 시작값과 종료 경계를 함께 확인하세요.`,
  arrays: `## 학습 목표

여러 값을 순서대로 저장하고 안전하게 순회합니다.

## 핵심 개념

배열과 문자열의 인덱스는 0부터 시작합니다. 길이가 N이면 마지막 인덱스는 N-1입니다. 정방향 순회뿐 아니라 마지막 원소부터 0번 원소까지 이동하는 역방향 순회도 자주 사용됩니다.

## 확인할 점

범위를 벗어난 인덱스 접근은 예측할 수 없는 결과를 만들 수 있습니다. 반복문의 경계를 먼저 검토하세요.`,
  stl: `## 학습 목표

\`vector\`와 \`sort\`를 이용해 데이터를 간결하게 다룹니다.

## 핵심 개념

\`std::vector\`는 크기를 조절할 수 있는 연속 컨테이너입니다. \`<algorithm>\`의 \`std::sort(begin, end)\`는 시작 위치부터 끝 위치 직전까지 오름차순으로 정렬합니다.

## 확인할 점

\`sort\`를 사용하려면 \`<algorithm>\`을 포함해야 하며, \`end()\`는 마지막 원소 다음 위치를 가리킵니다.`,
};

const problems = [
  {
    number: 1001,
    title: "Hello, C++!",
    difficulty: 1,
    category: "output",
    lesson: "io",
    statement: "화면에 Hello, C++!를 출력하세요.",
    input: "입력은 주어지지 않습니다.",
    output: "Hello, C++!를 출력합니다.",
    constraints: "대소문자와 문장 부호를 지켜 주세요.",
    sampleIn: "",
    sampleOut: "Hello, C++!",
    reference:
      '#include <iostream>\nint main() { std::cout << "Hello, C++!\\n"; }',
    hidden: [
      ["", "Hello, C++!"],
      ["", "Hello, C++!"],
      ["", "Hello, C++!"],
    ],
  },
  {
    number: 1002,
    title: "두 수 더하기",
    difficulty: 1,
    category: "io",
    lesson: "io",
    statement: "두 정수 A와 B를 입력받아 합을 출력하세요.",
    input: "두 정수 A와 B가 주어집니다.",
    output: "A와 B의 합을 출력합니다.",
    constraints: "-1,000,000 ≤ A, B ≤ 1,000,000",
    sampleIn: "3 5",
    sampleOut: "8",
    reference:
      "#include <iostream>\nint main() { long long a, b; std::cin >> a >> b; std::cout << a + b << '\\n'; }",
    hidden: [
      ["0 0", "0"],
      ["-5 3", "-2"],
      ["1000000 1000000", "2000000"],
    ],
  },
  {
    number: 1003,
    title: "홀수일까, 짝수일까?",
    difficulty: 1,
    category: "condition",
    lesson: "conditions",
    statement: "정수 N을 입력받아 홀수인지 짝수인지 구분하세요.",
    input: "정수 N이 주어집니다.",
    output: "짝수라면 EVEN, 홀수라면 ODD를 출력합니다.",
    constraints: "0 ≤ N ≤ 1,000,000",
    sampleIn: "7",
    sampleOut: "ODD",
    reference:
      '#include <iostream>\nint main() { long long n; std::cin >> n; std::cout << (n % 2 ? "ODD" : "EVEN") << \'\\n\'; }',
    hidden: [
      ["0", "EVEN"],
      ["2", "EVEN"],
      ["999999", "ODD"],
    ],
  },
  {
    number: 1004,
    title: "배열 뒤집기",
    difficulty: 2,
    category: "array",
    lesson: "arrays",
    statement: "N개의 정수를 마지막 원소부터 첫 원소까지 역순으로 출력하세요.",
    input: "첫 줄에 N, 둘째 줄에 N개의 정수가 주어집니다.",
    output: "정수를 역순으로 공백으로 구분하여 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000, 각 정수는 -10^9 이상 10^9 이하",
    sampleIn: "5\n1 2 3 4 5",
    sampleOut: "5 4 3 2 1",
    reference:
      "#include <iostream>\n#include <vector>\nint main() { int n; std::cin >> n; std::vector<long long> a(n); for (auto &x : a) std::cin >> x; for (int i = n - 1; i >= 0; --i) std::cout << a[i] << (i ? ' ' : '\\n'); }",
    hidden: [
      ["1\n42", "42"],
      ["3\n-1 0 1", "1 0 -1"],
      ["4\n2 2 1 3", "3 1 2 2"],
    ],
  },
  {
    number: 1005,
    title: "1부터 N까지의 합",
    difficulty: 2,
    category: "loop",
    lesson: "loops",
    statement: "1부터 N까지 모든 정수를 더한 값을 출력하세요.",
    input: "정수 N이 주어집니다.",
    output: "1부터 N까지의 합을 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000",
    sampleIn: "10",
    sampleOut: "55",
    reference:
      "#include <iostream>\nint main() { long long n; std::cin >> n; std::cout << n * (n + 1) / 2 << '\\n'; }",
    hidden: [
      ["1", "1"],
      ["100", "5050"],
      ["100000", "5000050000"],
    ],
  },
  {
    number: 1006,
    title: "가장 큰 수 찾기",
    difficulty: 2,
    category: "array",
    lesson: "arrays",
    statement: "N개의 정수 중 가장 큰 값을 출력하세요.",
    input: "첫 줄에 N, 둘째 줄에 N개의 정수가 주어집니다.",
    output: "가장 큰 정수를 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000, -10^9 ≤ 각 정수 ≤ 10^9",
    sampleIn: "5\n3 9 2 7 1",
    sampleOut: "9",
    reference:
      "#include <iostream>\n#include <algorithm>\nint main() { int n; std::cin >> n; long long answer, x; std::cin >> answer; while (--n) { std::cin >> x; answer = std::max(answer, x); } std::cout << answer << '\\n'; }",
    hidden: [
      ["1\n-7", "-7"],
      ["4\n-5 -2 -10 -3", "-2"],
      ["3\n1000000000 0 -1000000000", "1000000000"],
    ],
  },
  {
    number: 1007,
    title: "작은 수부터 정렬",
    difficulty: 3,
    category: "sorting",
    lesson: "stl",
    statement: "정수를 오름차순으로 정렬해 출력하세요.",
    input: "첫 줄에 N, 둘째 줄에 N개의 정수가 주어집니다.",
    output: "오름차순으로 정렬한 정수를 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000, -10^9 ≤ 각 정수 ≤ 10^9",
    sampleIn: "4\n8 2 5 1",
    sampleOut: "1 2 5 8",
    reference:
      "#include <iostream>\n#include <vector>\n#include <algorithm>\nint main() { int n; std::cin >> n; std::vector<long long> a(n); for (auto &x : a) std::cin >> x; std::sort(a.begin(), a.end()); for (int i = 0; i < n; ++i) std::cout << a[i] << (i + 1 < n ? ' ' : '\\n'); }",
    hidden: [
      ["1\n5", "5"],
      ["5\n3 1 3 2 1", "1 1 2 3 3"],
      ["4\n-1 -3 2 0", "-3 -1 0 2"],
    ],
  },
] as const;

const categoryNames: Record<string, string> = {
  output: "출력",
  io: "입출력",
  condition: "조건문",
  array: "배열",
  loop: "반복문",
  sorting: "정렬",
};

async function seed(): Promise<void> {
  const lessonCategoryIds = new Map<string, string>();
  for (const [index, [slug, title, summary]] of lessonCategories.entries()) {
    const category = await prisma.lessonCategory.upsert({
      where: { slug },
      update: { title, summary, order: index + 1, status: "PUBLISHED" },
      create: { slug, title, summary, order: index + 1, status: "PUBLISHED" },
    });
    lessonCategoryIds.set(slug, category.id);
  }
  const lessonIds = new Map<string, string>();
  for (const [index, [slug, title, summary]] of lessons.entries()) {
    const body = lessonBodies[slug];
    const categoryId = lessonCategoryIds.get(lessonCategoryBySlug[slug])!;
    const categoryOrder =
      lessons
        .slice(0, index)
        .filter(
          ([previousSlug]) =>
            lessonCategoryBySlug[previousSlug] === lessonCategoryBySlug[slug],
        ).length + 1;
    const lesson = await prisma.lesson.upsert({
      where: { slug },
      update: {
        categoryId,
        title,
        summary,
        body,
        order: categoryOrder,
        status: "PUBLISHED",
        publishedAt,
      },
      create: {
        slug,
        categoryId,
        title,
        summary,
        order: categoryOrder,
        status: "PUBLISHED",
        publishedAt,
        body,
      },
    });
    const lessonVersion = await prisma.lessonVersion.upsert({
      where: { lessonId_version: { lessonId: lesson.id, version: 1 } },
      update: { title, summary, body, publishedAt },
      create: {
        lessonId: lesson.id,
        version: 1,
        title,
        summary,
        body,
        publishedAt,
      },
    });
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { currentVersionId: lessonVersion.id },
    });
    lessonIds.set(slug, lesson.id);
  }
  await prisma.lessonCategory.deleteMany({
    where: { slug: "uncategorized", lessons: { none: {} } },
  });

  const categoryIds = new Map<string, string>();
  for (const [slug, name] of Object.entries(categoryNames)) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
    categoryIds.set(slug, category.id);
  }

  for (const [index, item] of problems.entries()) {
    await prisma.$transaction(async (tx) => {
      const problem = await tx.problem.upsert({
        where: { number: item.number },
        update: {
          title: item.title,
          difficulty: item.difficulty,
          status: "PUBLISHED",
        },
        create: {
          number: item.number,
          title: item.title,
          difficulty: item.difficulty,
          status: "PUBLISHED",
        },
      });
      const versionData = {
        title: item.title,
        difficulty: item.difficulty,
        statement: `# ${item.title}\n\n${item.statement}`,
        inputDescription: item.input,
        outputDescription: item.output,
        constraints: item.constraints,
        comparator: "TOKEN" as const,
        timeLimitMs: 1000,
        memoryLimitKiB: 131072,
        starterCode:
          "#include <iostream>\n\nint main() {\n    // 코드를 작성하세요.\n    return 0;\n}\n",
        referenceSource: item.reference,
        validatedAt: publishedAt,
        publishedAt,
      };
      let version = await tx.problemVersion.findUnique({
        where: { problemId_version: { problemId: problem.id, version: 1 } },
      });
      if (!version) {
        version = await tx.problemVersion.create({
          data: {
            problemId: problem.id,
            version: 1,
            ...versionData,
          },
        });
      } else {
        version = await tx.problemVersion.update({
          where: { id: version.id },
          data: versionData,
        });
      }
      await tx.testCase.deleteMany({ where: { problemVersionId: version.id } });
      await tx.testCase.createMany({
        data: [
          {
            problemVersionId: version.id,
            position: 1,
            visibility: "EXAMPLE",
            input: item.sampleIn,
            expectedOutput: item.sampleOut,
            explanation: "공개 예제",
          },
          ...item.hidden.map(([input, expectedOutput], hiddenIndex) => ({
            problemVersionId: version.id,
            position: hiddenIndex + 2,
            visibility: "HIDDEN" as const,
            input,
            expectedOutput,
            explanation: null,
          })),
        ],
      });
      await tx.problem.update({
        where: { id: problem.id },
        data: { currentVersionId: version.id },
      });
      await tx.problemCategory.upsert({
        where: {
          problemId_categoryId: {
            problemId: problem.id,
            categoryId: categoryIds.get(item.category)!,
          },
        },
        update: {},
        create: {
          problemId: problem.id,
          categoryId: categoryIds.get(item.category)!,
        },
      });
      await tx.lessonProblem.upsert({
        where: {
          lessonId_problemId: {
            lessonId: lessonIds.get(item.lesson)!,
            problemId: problem.id,
          },
        },
        update: { order: index + 1 },
        create: {
          lessonId: lessonIds.get(item.lesson)!,
          problemId: problem.id,
          order: index + 1,
        },
      });
    });
  }
}

seed()
  .then(() => process.stdout.write("CppStudy seed completed.\n"))
  .finally(() => prisma.$disconnect());
