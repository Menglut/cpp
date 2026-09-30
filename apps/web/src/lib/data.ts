export const starter =
  "#include <iostream>\nusing namespace std;\n\nint main() {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n";
export const starterC11 =
  "#include <stdio.h>\n\nint main(void) {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n";
export type Problem = {
  id: number;
  title: string;
  category: string;
  level: number;
  lesson: string;
  description: string;
  input: string;
  output: string;
  constraints: string;
  sampleIn: string;
  sampleOut: string;
};
export const problems: Problem[] = [
  {
    id: 1001,
    title: "Hello, C++!",
    category: "입출력",
    level: 1,
    lesson: "io",
    description:
      "프로그래밍의 첫걸음입니다. 화면에 Hello, C++!를 출력해 보세요.",
    input: "입력은 주어지지 않습니다.",
    output: "Hello, C++!를 출력합니다.",
    constraints: "출력 문장의 대소문자와 문장 부호를 지켜 주세요.",
    sampleIn: "",
    sampleOut: "Hello, C++!",
  },
  {
    id: 1002,
    title: "두 수 더하기",
    category: "입출력",
    level: 1,
    lesson: "io",
    description:
      "두 정수 A와 B를 입력받아 합을 출력하는 프로그램을 작성하세요.",
    input: "첫 줄에 두 정수 A와 B가 공백으로 주어집니다.",
    output: "A와 B의 합을 출력합니다.",
    constraints: "−1,000,000 ≤ A, B ≤ 1,000,000",
    sampleIn: "3 5",
    sampleOut: "8",
  },
  {
    id: 1003,
    title: "홀수일까, 짝수일까?",
    category: "조건문",
    level: 1,
    lesson: "conditions",
    description: "정수 N을 입력받아 홀수인지 짝수인지 구분해 보세요.",
    input: "첫 줄에 정수 N이 주어집니다.",
    output: "짝수라면 EVEN, 홀수라면 ODD를 출력합니다.",
    constraints: "0 ≤ N ≤ 1,000,000",
    sampleIn: "7",
    sampleOut: "ODD",
  },
  {
    id: 1004,
    title: "배열 뒤집기",
    category: "배열",
    level: 2,
    lesson: "arrays",
    description:
      "N개의 정수가 담긴 배열이 주어집니다. 배열의 마지막 원소부터 첫 번째 원소까지 역순으로 출력하세요.",
    input: "첫 줄에 정수 N, 둘째 줄에 N개의 정수가 공백으로 주어집니다.",
    output: "정수를 역순으로, 공백으로 구분하여 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000 · 각 정수는 −10⁹ 이상 10⁹ 이하",
    sampleIn: "5\n1 2 3 4 5",
    sampleOut: "5 4 3 2 1",
  },
  {
    id: 1005,
    title: "1부터 N까지의 합",
    category: "반복문",
    level: 2,
    lesson: "loops",
    description:
      "1부터 N까지 모든 정수를 더한 값을 출력하세요. 자료형의 범위에 주의하세요.",
    input: "첫 줄에 정수 N이 주어집니다.",
    output: "1부터 N까지의 합을 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000",
    sampleIn: "10",
    sampleOut: "55",
  },
  {
    id: 1006,
    title: "가장 큰 수 찾기",
    category: "배열",
    level: 2,
    lesson: "arrays",
    description: "N개의 정수 중 가장 큰 값을 찾아 출력하세요.",
    input: "첫 줄에 N, 둘째 줄에 N개의 정수가 주어집니다.",
    output: "가장 큰 정수를 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000 · −10⁹ ≤ 각 정수 ≤ 10⁹",
    sampleIn: "5\n3 9 2 7 1",
    sampleOut: "9",
  },
  {
    id: 1007,
    title: "작은 수부터 정렬",
    category: "STL",
    level: 3,
    lesson: "stl",
    description: "정수를 오름차순으로 정렬해 출력하세요.",
    input: "첫 줄에 N, 둘째 줄에 N개의 정수가 주어집니다.",
    output: "오름차순으로 정렬한 정수를 공백으로 구분하여 출력합니다.",
    constraints: "1 ≤ N ≤ 100,000 · −10⁹ ≤ 각 정수 ≤ 10⁹",
    sampleIn: "4\n8 2 5 1",
    sampleOut: "1 2 5 8",
  },
];
export type Lesson = {
  slug: string;
  title: string;
  sub: string;
  minutes: number;
  code: string;
  result: string;
  explanation: string;
  mistake: string;
  prerequisite: string;
};
export const lessons: Lesson[] = [
  {
    slug: "io",
    title: "시작과 입출력",
    sub: "첫 번째 C++ 프로그램을 만나 보세요",
    minutes: 12,
    prerequisite: "선행 개념 없음",
    explanation:
      "프로그램은 main 함수에서 시작합니다. iostream을 포함하면 cin으로 값을 입력받고 cout으로 출력할 수 있어요. 입력 연산자 >>는 공백과 줄바꿈을 기준으로 값을 구분합니다.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << "\\n";\n    return 0;\n}',
    result: "입력: 3 5\n출력: 8",
    mistake:
      "문장 끝의 세미콜론(;)을 잊지 마세요. cin은 >>, cout은 <<를 사용합니다.",
  },
  {
    slug: "variables",
    title: "변수와 자료형",
    sub: "데이터에 이름과 알맞은 크기를 정해요",
    minutes: 15,
    prerequisite: "시작과 입출력",
    explanation:
      "변수는 값을 저장하는 공간입니다. 정수는 int와 long long, 소수는 double, 참과 거짓은 bool로 표현합니다. 큰 합을 계산할 때에는 계산 중간값까지 담을 수 있는 자료형을 선택하세요.",
    code: '#include <iostream>\nint main() {\n    long long n = 100000;\n    std::cout << n * (n + 1) / 2 << "\\n";\n}',
    result: "출력: 5000050000",
    mistake:
      "int 계산이 넘친 뒤 long long에 대입해도 이미 손실된 값은 복원되지 않습니다.",
  },
  {
    slug: "conditions",
    title: "조건문",
    sub: "조건에 따라 다른 길로 나아가요",
    minutes: 18,
    prerequisite: "변수와 자료형",
    explanation:
      "if는 조건이 참일 때 블록 안의 코드를 실행합니다. else는 그 조건이 거짓일 때 실행합니다. 나머지 연산자 %로 2로 나눈 나머지를 확인하면 홀짝을 구분할 수 있습니다.",
    code: '#include <iostream>\nint main() {\n    int n = 7;\n    if (n % 2 == 0) std::cout << "EVEN\\n";\n    else std::cout << "ODD\\n";\n}',
    result: "출력: ODD",
    mistake: "비교는 ==, 대입은 =입니다. 두 연산자를 구분하세요.",
  },
  {
    slug: "loops",
    title: "반복문",
    sub: "반복되는 일을 간결하게 표현해요",
    minutes: 20,
    prerequisite: "조건문",
    explanation:
      "for는 초기화, 반복 조건, 증감식을 순서대로 사용합니다. 조건을 확인하고 본문을 실행한 뒤 증감식으로 이동합니다. 반복이 끝나는 경계를 꼭 확인하세요.",
    code: "#include <iostream>\nint main() {\n    for (int i = 0; i < 10; ++i) {\n        if (i > 0) std::cout << ' ';\n        std::cout << i;\n    }\n    std::cout << \"\\n\";\n}",
    result: "출력: 0 1 2 3 4 5 6 7 8 9",
    mistake: "i < 10과 i <= 10은 반복 횟수가 다릅니다. 종료 조건을 확인하세요.",
  },
  {
    slug: "arrays",
    title: "배열과 문자열",
    sub: "여러 데이터를 순서대로 다루는 방법",
    minutes: 25,
    prerequisite: "반복문",
    explanation:
      "배열은 같은 자료형의 값을 연속해서 저장합니다. 인덱스는 0부터 시작하므로 길이가 N인 배열의 마지막 인덱스는 N−1입니다. 역순으로 순회하려면 마지막 인덱스에서 0까지 이동합니다.",
    code: "#include <iostream>\nint main() {\n    int a[] = {1, 2, 3, 4, 5};\n    for (int i = 4; i >= 0; --i) {\n        if (i < 4) std::cout << ' ';\n        std::cout << a[i];\n    }\n    std::cout << \"\\n\";\n}",
    result: "출력: 5 4 3 2 1",
    mistake:
      "길이가 5인 배열에 a[5]로 접근하면 범위를 벗어납니다. 역순 반복에는 음수를 표현할 수 있는 인덱스를 사용하세요.",
  },
  {
    slug: "stl",
    title: "STL 시작하기",
    sub: "vector와 sort로 더 간결하게",
    minutes: 25,
    prerequisite: "배열과 반복문",
    explanation:
      "vector는 크기를 조절할 수 있는 배열입니다. algorithm 헤더의 sort에 시작과 끝 반복자를 전달하면 오름차순으로 정렬됩니다. end()는 마지막 원소 다음 위치를 가리킵니다.",
    code: "#include <iostream>\n#include <vector>\n#include <algorithm>\nint main() {\n    std::vector<int> a = {8, 2, 5, 1};\n    std::sort(a.begin(), a.end());\n    for (int n : a) std::cout << n << ' ';\n}",
    result: "출력: 1 2 5 8",
    mistake: "sort를 사용하려면 <algorithm> 헤더를 포함해야 합니다.",
  },
];
export const verdicts: Record<string, string> = {
  SUCCESS: "실행 성공",
  AC: "정답입니다",
  WA: "틀렸습니다",
  CE: "컴파일 오류",
  RE: "실행 중 오류",
  TLE: "시간 초과",
  MLE: "메모리 초과",
  OLE: "출력 초과",
  SYSTEM_ERROR: "시스템 오류",
  CANCELLED: "취소됨",
  PENDING: "채점 대기",
  QUEUED: "처리 대기",
  COMPILING: "컴파일 중",
  RUNNING: "실행 중",
};
